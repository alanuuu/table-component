import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Input, DatePicker, Button, Tree, Checkbox, Empty } from 'antd';
import dayjs from 'dayjs';
import { collectTreeValues, debounce } from './utils';
import { SelectFooter } from './formRenderers';

const { RangePicker } = DatePicker;

/**
 * 列头下拉过滤面板 —— 基于 antd 组件库
 *
 * 支持的 filter.type:
 * - multiSelect / asyncSelect → 搜索框 + Checkbox.Group 平铺
 * - treeSelect → 搜索框 + Tree(checkable) 平铺
 * - dateRange → RangePicker
 * - input → Input
 *
 * 底部栏: [全选 Checkbox | 已选 N/M]  [重置] [确定]
 */
const ColumnFilter = ({ filter, value, onChange, onConfirm, onReset }) => {
  const { type, placeholder } = filter;

  // multiSelect 远程 options
  const [options, setOptions] = useState(filter.options || []);
  const [optionsLoading, setOptionsLoading] = useState(false);

  // treeSelect
  const [treeData, setTreeData] = useState(filter.treeData || []);
  const treeLoadedKeysRef = useRef(new Set());

  // 内部选中值（ref 存储，减少 re-render）
  const innerValueRef = useRef(
    value == null ? [] : (Array.isArray(value) ? value : [value])
  );
  const [, forceUpdate] = useState(0);
  const rerender = () => forceUpdate((n) => n + 1);

  // 搜索关键词
  const [searchKeyword, setSearchKeyword] = useState('');

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

  const debouncedLoadMulti = useMemo(
    () => debounce(loadMultiOptions, 300),
    [loadMultiOptions]
  );

  useEffect(() => {
    if ((type === 'multiSelect' || type === 'asyncSelect')
      && typeof filter.loadOptions === 'function') {
      loadMultiOptions();
    }
  }, [type]);

  useEffect(() => {
    if (type === 'treeSelect' && filter.treeData) {
      setTreeData(filter.treeData);
    }
  }, [type, filter.treeData]);

  useEffect(() => {
    innerValueRef.current = value == null ? [] : (Array.isArray(value) ? value : [value]);
    rerender();
  }, [value]);

  // ============ 树形懒加载 ============
  const handleTreeLoadData = useCallback(async (node) => {
    if (typeof filter.loadTreeData !== 'function') return;
    if (treeLoadedKeysRef.current.has(node.value)) return;
    const children = await filter.loadTreeData(node);
    if (!children?.length) return;
    setTreeData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const append = (list, key) => {
        for (const n of list) {
          if (n.value === key) { n.children = children; return true; }
          if (n.children?.length && append(n.children, key)) return true;
        }
        return false;
      };
      append(next, node.value);
      return next;
    });
    treeLoadedKeysRef.current.add(node.value);
  }, [filter]);

  // ============ 本地搜索 ============
  const filteredOptions = useMemo(() => {
    if (!searchKeyword) return options;
    if (typeof filter.loadOptions === 'function') return options;
    const kw = searchKeyword.toLowerCase();
    return options.filter((o) => String(o.label ?? '').toLowerCase().includes(kw));
  }, [options, searchKeyword, filter.loadOptions]);

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
      innerValueRef.current = [...new Set([...cur, ...flatValues])];
    } else {
      innerValueRef.current = cur.filter((v) => !flatValues.includes(v));
    }
    rerender();
  }, [flatValues]);

  // ============ 提交 ============
  const commitValue = useCallback((nextArr) => {
    if (nextArr.length === 0) {
      onChange?.(null);
    } else {
      onChange?.(nextArr);
    }
  }, [onChange]);

  const handleReset = useCallback(() => {
    innerValueRef.current = [];
    rerender();
    onReset?.();
  }, [onReset]);

  // ============ 树形节点搜索高亮 ============
  const highlightTreeTitle = useCallback((nodes, keyword) => {
    if (!keyword) return nodes;
    const kw = keyword.toLowerCase();
    return nodes.map((n) => {
      const title = String(n.title ?? '');
      const idx = title.toLowerCase().indexOf(kw);
      let displayTitle = title;
      if (idx >= 0) {
        displayTitle = (
          <span>
            {title.slice(0, idx)}
            <span style={{ color: '#1677ff', background: '#e6f4ff' }}>
              {title.slice(idx, idx + keyword.length)}
            </span>
            {title.slice(idx + keyword.length)}
          </span>
        );
      }
      return {
        ...n,
        title: displayTitle,
        children: n.children?.length ? highlightTreeTitle(n.children, keyword) : n.children,
      };
    });
  }, []);

  const showFooter = (type === 'multiSelect' || type === 'asyncSelect' || type === 'treeSelect')
    && filter.showAll !== false;

  const handleConfirm = useCallback(() => {
    if (showFooter) commitValue(innerValueRef.current);
    onConfirm?.();
  }, [commitValue, onConfirm, showFooter]);

  const scrollBoxStyle = {
    maxHeight: 240,
    overflowY: 'auto',
    padding: '4px 0',
  };

  // ============ 渲染 ============
  let body;
  switch (type) {
    case 'multiSelect':
    case 'asyncSelect':
      body = (
        <div style={{ width: 320 }}>
          <Input
            placeholder={placeholder || '搜索...'}
            allowClear
            style={{ marginBottom: 8 }}
            onChange={(e) => {
              const kw = e.target.value;
              setSearchKeyword(kw);
              if (typeof filter.loadOptions === 'function') {
                setOptionsLoading(true);
                debouncedLoadMulti(kw);
              }
            }}
          />
          {optionsLoading ? (
            <div style={{ textAlign: 'center', color: '#999', padding: '16px 0' }}>
              加载中...
            </div>
          ) : filteredOptions.length === 0 ? (
            <Empty description="无选项" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <div style={scrollBoxStyle}>
              <Checkbox.Group
                value={innerValueRef.current}
                onChange={(vals) => {
                  innerValueRef.current = vals || [];
                  rerender();
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
              >
                {filteredOptions.map((opt) => (
                  <Checkbox
                    key={opt.value}
                    value={opt.value}
                    style={{ padding: '4px 8px', borderRadius: 4, lineHeight: '22px' }}
                  >
                    {opt.label}
                  </Checkbox>
                ))}
              </Checkbox.Group>
            </div>
          )}
        </div>
      );
      break;

    case 'treeSelect':
      body = (
        <div style={{ width: 320 }}>
          <Input
            placeholder={placeholder || '搜索...'}
            allowClear
            style={{ marginBottom: 8 }}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
          {treeData.length === 0 ? (
            <Empty description="无选项" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <div style={scrollBoxStyle}>
              <Tree
                checkable
                fieldNames={{ title: 'title', key: 'value', children: 'children' }}
                treeData={highlightTreeTitle(treeData, searchKeyword)}
                checkedKeys={innerValueRef.current}
                onCheck={(checkedKeys) => {
                  const keys = Array.isArray(checkedKeys)
                    ? checkedKeys
                    : (checkedKeys?.checked || []);
                  innerValueRef.current = keys;
                  rerender();
                }}
                filterTreeNode={(node) => {
                  if (!searchKeyword) return true;
                  const title = String(node.title ?? '');
                  return title.toLowerCase().includes(searchKeyword.toLowerCase());
                }}
                defaultExpandAll={filter.treeDefaultExpandAll !== false}
                virtual={false}
                loadData={typeof filter.loadTreeData === 'function'
                  ? handleTreeLoadData
                  : undefined}
              />
            </div>
          )}
        </div>
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
    <div
      style={{ padding: 16, minWidth: 280, maxWidth: 360 }}
      onClick={(e) => e.stopPropagation()}
    >
      {body}
      {showFooter && (
        <div style={{ marginTop: 12 }}>
          <SelectFooter
            value={innerValueRef.current}
            flatValues={flatValues}
            onToggleAll={handleToggleAll}
            onReset={handleReset}
            onConfirm={handleConfirm}
          />
        </div>
      )}
    </div>
  );
};

export default ColumnFilter;
