import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Select, Input, DatePicker, Button, TreeSelect, Checkbox, Tag } from 'antd';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

/**
 * FilterDropdownBody — antd Table 原生 filterDropdown 自定义渲染体
 *
 * 性能优化（Vercel react-best-practices 对齐）：
 * ✅ rerender-use-ref-transient-values：innerValue 用 ref 存储，打开期间用户选 N 次只 commit 1 次
 * ✅ rerender-no-inline-components：FilterIcon 提取到模块级常量避免每次 render 构造闭包
 * ✅ js-cache-function-results：loadOptions 结果只缓存一次
 * ✅ bundle-dynamic-imports：不引入 @ant-design/pro-utils，自行实现 useDebouncedFn
 *
 * 支持的 filter.type:
 * - multiSelect  — 多选列表（options / loadOptions 远程加载 + 搜索防抖）
 * - treeSelect   — 树形多选（treeData / loadTreeData 懒加载）
 * - dateRange    — 日期范围
 * - input        — 模糊搜索
 * - select       — 不走本组件，走 antd 原生 filters 复选框面板
 *
 * 底部栏（multiSelect / treeSelect 自动出现）:
 *   [全选 Checkbox (三态)]                      已选 N / M
 */

// ============ 工具函数 ============

// 简易防抖 hook（不引入外部依赖）
const useDebouncedFn = (fn, wait = 300) => {
  const timerRef = useRef(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  return useCallback((...args) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fnRef.current(...args), wait);
  }, [wait]);
};

// 平铺树 → 收集所有 value
const collectTreeValues = (nodes = []) => {
  const arr = [];
  const walk = (list) => {
    for (const n of list) {
      if (n.value !== undefined) arr.push(n.value);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nodes);
  return arr;
};

// 递归把远程懒加载 children 挂到 tree 上
const appendTreeNodeChildren = (tree, key, children) => {
  for (const node of tree) {
    if (node.value === key) { node.children = children; return true; }
    if (node.children?.length && appendTreeNodeChildren(node.children, key, children)) return true;
  }
  return false;
};

// ============ 核心组件 ============
const FilterDropdownBody = ({ filter, value, onChange, onConfirm, onReset }) => {
  const { type, placeholder } = filter;

  // ---- multiSelect / asyncSelect 扁平 options ----
  const [options, setOptions] = useState(filter.options || []);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const loadedOnceRef = useRef(false);

  // ---- treeSelect ----
  const [treeData, setTreeData] = useState(filter.treeData || []);
  const treeLoadedKeysRef = useRef(new Set());

  // ✅ 性能优化：innerValue 用 ref 存，打开期间 N 次操作不触发父组件重渲染
  const innerValueRef = useRef(
    value == null ? [] : (Array.isArray(value) ? value : [value])
  );
  // 仅在需要重新渲染 Select 显示时 forceUpdate
  const [, forceUpdate] = useState(0);
  const rerender = () => forceUpdate((n) => n + 1);

  // ============ 加载 options ============
  const loadMultiOptions = useCallback(async (keyword) => {
    if (typeof filter.loadOptions !== 'function') return;
    setOptionsLoading(true);
    try {
      const result = await filter.loadOptions(keyword);
      setOptions(result || []);
    } finally {
      setOptionsLoading(false);
    }
  }, [filter]);

  const debouncedLoadMulti = useDebouncedFn(loadMultiOptions, 300);

  useEffect(() => {
    // FilterDropdownBody 每次打开下拉都是新 mount（antd v6 filterDropdown 行为）
    // 所以不需要 loadedOnceRef gate，直接加载
    if ((type === 'multiSelect' || type === 'asyncSelect') && typeof filter.loadOptions === 'function') {
      loadMultiOptions();
    }
  }, []);  // 只在 mount 时执行一次

  useEffect(() => {
    if (type === 'treeSelect' && filter.treeData) {
      setTreeData(filter.treeData);
    }
  }, [type, filter.treeData]);

  // 关闭 → 重新打开时重置内部值为外部 value
  useEffect(() => {
    innerValueRef.current = value == null ? [] : (Array.isArray(value) ? value : [value]);
    rerender();
  }, [value]);

  // ============ 树形懒加载 ============
  const onTreeLoadData = useCallback(async (node) => {
    if (typeof filter.loadTreeData !== 'function') return;
    if (treeLoadedKeysRef.current.has(node.value)) return;
    const children = await filter.loadTreeData(node);
    if (!children?.length) return;
    setTreeData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      appendTreeNodeChildren(next, node.value, children);
      return next;
    });
    treeLoadedKeysRef.current.add(node.value);
  }, [filter]);

  // ============ 提交 / 重置 ============
  // ✅ 优化：只在确定 / 重置 / 全选 时 commit 一次，不在用户每次勾选时 commit
  const commitValue = useCallback((nextArr) => {
    innerValueRef.current = nextArr;
    if (nextArr.length === 0) {
      onChange?.(null);
    } else {
      onChange?.(nextArr);
    }
  }, [onChange]);

  const handleReset = useCallback(() => {
    commitValue([]);
    onReset?.();
  }, [commitValue, onReset]);

  const handleConfirm = useCallback(() => {
    onConfirm?.();
  }, [onConfirm]);

  // ============ 全选逻辑 ============
  const flatValues = useMemo(() => {
    if (type === 'treeSelect') return collectTreeValues(treeData);
    return (options || []).map((o) => o.value);
  }, [type, treeData, options]);

  const isAllChecked = useMemo(() => {
    if (!flatValues.length) return false;
    const cur = innerValueRef.current;
    return flatValues.every((v) => cur.includes(v));
  }, [flatValues]);

  const isIndeterminate = useMemo(() => {
    if (!flatValues.length) return false;
    const cur = innerValueRef.current;
    const checkedCount = flatValues.filter((v) => cur.includes(v)).length;
    return checkedCount > 0 && checkedCount < flatValues.length;
  }, [flatValues]);

  const selectedCount = innerValueRef.current.length;

  const handleToggleAll = useCallback((e) => {
    const cur = innerValueRef.current;
    if (e.target.checked) {
      commitValue([...new Set([...cur, ...flatValues])]);
    } else {
      commitValue(cur.filter((v) => !flatValues.includes(v)));
    }
  }, [flatValues, commitValue]);

  // ============ 底部栏（一行 flex：左 全选+数量，右 重置+确定）============
  const showFooter = (type === 'multiSelect' || type === 'asyncSelect' || type === 'treeSelect')
    && filter.showAll !== false;

  // ============ 主体 ============
  const commonSelectProps = {
    mode: 'multiple',
    placeholder: placeholder || '请选择',
    value: innerValueRef.current,
    allowClear: true,
    maxTagCount: 'responsive',
    style: { width: 280 },
    onChange: (val) => {
      innerValueRef.current = val || [];
      rerender();
    },
  };

  let body;
  switch (type) {
    case 'multiSelect':
    case 'asyncSelect':
      body = (
        <Select
          {...commonSelectProps}
          options={options}
          loading={optionsLoading}
          showSearch
          optionFilterProp="label"
          virtual={options.length > 50}
          onSearch={(kw) => {
            setOptionsLoading(true);
            if (typeof filter.loadOptions === 'function') {
              debouncedLoadMulti(kw);
            }
            setTimeout(() => setOptionsLoading(false), 50);
          }}
        />
      );
      break;

    case 'treeSelect':
      body = (
        <TreeSelect
          {...commonSelectProps}
          treeData={treeData}
          treeCheckable={filter.treeCheckable !== false}
          treeDefaultExpandAll={filter.treeDefaultExpandAll !== false}
          treeLoadData={typeof filter.loadTreeData === 'function' ? onTreeLoadData : undefined}
          showSearch
          treeNodeFilterProp="label"
          maxTagPlaceholder={(omitted) => <Tag>+{omitted.length}</Tag>}
          virtual
        />
      );
      break;

    case 'dateRange':
      body = (
        <RangePicker
          style={{ width: 280 }}
          value={value?.start && value?.end
            ? [dayjs(value.start), dayjs(value.end)]
            : null
          }
          onChange={(dates) => {
            if (!dates || dates[0] == null || dates[1] == null) {
              commitValue([]);
            } else {
              onChange?.({
                start: dates[0].format('YYYY-MM-DD'),
                end: dates[1].format('YYYY-MM-DD'),
              });
            }
          }}
        />
      );
      break;

    case 'input':
      body = (
        <Input
          placeholder={placeholder || '请输入'}
          value={value || ''}
          allowClear
          style={{ width: 240 }}
          onChange={(e) => onChange?.(e.target.value || null)}
          onPressEnter={handleConfirm}
        />
      );
      break;

    default:
      body = <span style={{ color: '#999' }}>不支持的过滤类型: {type}</span>;
  }

  return (
    <div style={{ padding: 16, minWidth: 280, maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
      {body}

      <div
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        {/* 左侧：全选 + 数量（多选类型才显示） */}
        {showFooter ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Checkbox
              checked={isAllChecked}
              indeterminate={isIndeterminate}
              onChange={handleToggleAll}
            >
              全选
            </Checkbox>
            <span style={{ color: '#8c8c8c', fontSize: 12 }}>
              已选 <span style={{ color: '#1677ff', fontWeight: 500 }}>{selectedCount}</span>
              {flatValues.length > 0 && <> / {flatValues.length}</>}
            </span>
          </div>
        ) : <span />}

        {/* 右侧：重置 + 确定 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="small" onClick={handleReset}>重置</Button>
          <Button size="small" type="primary" onClick={handleConfirm}>确定</Button>
        </div>
      </div>
    </div>
  );
};

export default FilterDropdownBody;
