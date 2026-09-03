import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Form, Select, DatePicker, Input, InputNumber, Switch, TreeSelect, Checkbox, Button, Space } from 'antd';
import { debounce, collectTreeValues } from './utils';

const { RangePicker } = DatePicker;

/**
 * 模块级选项缓存
 *
 * react-best-practices: js-cache-function-results — 跨 FilterForm + FilterDrawer + ColumnFilter 实例
 */
const optionsCache = new Map();

/**
 * ========== SelectFooter —— 模块级共用下拉底栏 ==========
 *
 * ColumnFilter（列头下拉）和 FilterFormBase（表单控件 Select）都用它，样式完全统一。
 *
 * react-best-practices: rerender-no-inline-components — 模块级，不随父组件每次 render 新建
 */
export const SelectFooter = ({
  value,              // 当前值数组
  flatValues = [],    // 所有可选 values 数组，用于计算 全选 / 已选 N/M
  onToggleAll,        // 全选/取消全选
  onReset,            // 清空
  onConfirm,          // 确定 → 关闭下拉
}) => {
  const selectedArr = Array.isArray(value) ? value : [];
  const selectedSet = useMemo(() => new Set(selectedArr), [selectedArr]);
  const isAllChecked = flatValues.length > 0 && flatValues.every((v) => selectedSet.has(v));
  const isIndeterminate = !isAllChecked && flatValues.some((v) => selectedSet.has(v));

  return (
    <div
      style={{
        padding: '8px 12px',
        borderTop: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        background: '#fafafa',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Checkbox
          checked={isAllChecked}
          indeterminate={isIndeterminate}
          onChange={(e) => onToggleAll?.(e.target.checked)}
        >
          全选
        </Checkbox>
        <span style={{ color: '#8c8c8c', fontSize: 12 }}>
          已选 <span style={{ color: '#1677ff', fontWeight: 500 }}>{selectedArr.length}</span>
          {flatValues.length > 0 && <> / {flatValues.length}</>}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button size="small" onClick={onReset}>重置</Button>
        <Button size="small" type="primary" onClick={onConfirm}>确定</Button>
      </div>
    </div>
  );
};

/**
 * ========== 带底栏的 multiSelect Select 包装器 ==========
 *
 * 给 antd Select (mode="multiple") 注入 popupRender 底栏，
 * 同时用受控 open 支持"确定"按钮关闭下拉。
 */
const MultiSelectWithFooter = ({ options: staticOptions, value, onChange, children, open, onOpenChange, ...selectProps }) => {
  const handleToggleAll = useCallback((checked) => {
    const flatValues = (staticOptions || []).map((o) => o.value);
    const next = checked ? Array.from(new Set([...(value || []), ...flatValues])) : [];
    onChange?.(next);
  }, [value, onChange, staticOptions]);

  const handleReset = useCallback(() => onChange?.([]), [onChange]);
  const handleConfirm = useCallback(() => onOpenChange?.(false), [onOpenChange]);

  return (
    <Select
      {...selectProps}
      mode="multiple"
      value={value}
      onChange={onChange}
      open={open}
      onOpenChange={onOpenChange}
      options={staticOptions}
      popupRender={(menu) => (
        <>
          {menu}
          <SelectFooter
            value={value}
            flatValues={(staticOptions || []).map((o) => o.value)}
            onToggleAll={handleToggleAll}
            onReset={handleReset}
            onConfirm={handleConfirm}
          />
        </>
      )}
    />
  );
};

/**
 * ========== 带底栏的 AsyncMultiSelect ==========
 */
export const AsyncMultiSelect = ({
  loadOptions,
  options: staticOptions,
  placeholder,
  value,
  onChange,
  cacheKey,
  ...rest
}) => {
  const [options, setOptions] = useState(() => staticOptions || []);
  const [loading, setLoading] = useState(false);
  const loadedOnceRef = useRef(false);
  const [open, setOpen] = useState(false);

  const doLoad = useCallback(async (keyword) => {
    if (typeof loadOptions !== 'function') return;
    if (!keyword) {
      const hit = optionsCache.get(cacheKey);
      if (hit) { setOptions(hit); return; }
    }
    setLoading(true);
    try {
      const list = await loadOptions(keyword);
      setOptions(list || []);
      if (!keyword && cacheKey) optionsCache.set(cacheKey, list || []);
    } finally {
      setLoading(false);
    }
  }, [loadOptions, cacheKey]);

  useEffect(() => {
    if (!loadedOnceRef.current && typeof loadOptions === 'function') {
      loadedOnceRef.current = true;
      const hit = cacheKey ? optionsCache.get(cacheKey) : null;
      if (hit) setOptions(hit);
      else doLoad();
    }
  }, [loadOptions, cacheKey, doLoad]);

  const handleSearch = useMemo(() => debounce((kw) => doLoad(kw), 300), [doLoad]);

  return (
    <MultiSelectWithFooter
      options={options}
      value={value}
      onChange={onChange}
      open={open}
      onOpenChange={setOpen}
      placeholder={placeholder}
      allowClear
      showSearch={{ optionFilterProp: 'label', onSearch: handleSearch }}
      loading={loading}
      virtual={(options?.length || 0) > 50}
      maxTagCount="responsive"
      {...rest}
    />
  );
};

/**
 * ========== 带底栏的 AsyncTreeSelect ==========
 */
export const AsyncTreeSelect = ({
  treeData: staticTreeData,
  loadTreeData,
  placeholder,
  value,
  onChange,
  ...rest
}) => {
  const [treeData, setTreeData] = useState(() => staticTreeData || []);
  const [open, setOpen] = useState(false);
  const treeLoadedKeysRef = useRef(new Set());

  useEffect(() => {
    if (staticTreeData) setTreeData(staticTreeData);
  }, [staticTreeData]);

  const onLoadData = useCallback(async (node) => {
    if (typeof loadTreeData !== 'function') return;
    if (treeLoadedKeysRef.current.has(node.value)) return;
    const children = await loadTreeData(node);
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
  }, [loadTreeData]);

  const flatValues = useMemo(() => collectTreeValues(treeData), [treeData]);

  const handleToggleAll = useCallback((checked) => {
    const next = checked ? Array.from(new Set([...(value || []), ...flatValues])) : [];
    onChange?.(next);
  }, [value, onChange, flatValues]);

  const handleReset = useCallback(() => onChange?.([]), [onChange]);
  const handleConfirm = useCallback(() => setOpen(false), []);

  return (
    <TreeSelect
      mode="multiple"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      allowClear
      treeData={treeData}
      treeCheckable={rest.treeCheckable !== false}
      treeDefaultExpandAll={rest.treeDefaultExpandAll !== false}
      treeLoadData={typeof loadTreeData === 'function' ? onLoadData : undefined}
      showSearch={{ treeNodeFilterProp: 'label' }}
      maxTagCount="responsive"
      virtual
      open={open}
      onOpenChange={setOpen}
      popupRender={(menu) => (
        <>
          {menu}
          <SelectFooter
            value={value}
            flatValues={flatValues}
            onToggleAll={handleToggleAll}
            onReset={handleReset}
            onConfirm={handleConfirm}
          />
        </>
      )}
      {...rest}
    />
  );
};

/**
 * ========== renderFilterFormItem（静态 multiSelect 也用带底栏的 MultiSelectWithFooter） ==========
 */
export const renderFilterFormItem = (item) => {
  const baseProps = { placeholder: item.placeholder, allowClear: true };

  let child;
  switch (item.type) {
    case 'select':
      child = <Select {...baseProps} options={item.options} mode={item.mode} />;
      break;

    case 'multiSelect':
    case 'asyncSelect':
      if (typeof item.loadOptions === 'function') {
        child = (
          <AsyncMultiSelect
            {...baseProps}
            loadOptions={item.loadOptions}
            options={item.options}
            cacheKey={item.name}
          />
        );
      } else {
        // 静态 multiSelect 也走带底栏的 MultiSelectWithFooter
        child = (
          <MultiSelectWithFooter
            {...baseProps}
            options={item.options}
            showSearch={{ optionFilterProp: 'label' }}
            virtual={(item.options?.length || 0) > 50}
          />
        );
      }
      break;

    case 'treeSelect':
      child = (
        <AsyncTreeSelect
          {...baseProps}
          treeData={item.treeData}
          loadTreeData={item.loadTreeData}
          treeCheckable={item.treeCheckable}
          treeDefaultExpandAll={item.treeDefaultExpandAll}
        />
      );
      break;

    case 'dateRange':
      child = <RangePicker style={{ width: '100%' }} />;
      break;

    case 'input':
      child = <Input {...baseProps} />;
      break;

    case 'inputNumber':
      child = <InputNumber style={{ width: '100%' }} {...baseProps} />;
      break;

    case 'switch':
      child = <Switch />;
      break;

    default:
      child = <Input {...baseProps} />;
  }

  return (
    <Form.Item
      key={item.name}
      label={item.label}
      name={item.name}
      rules={item.rules}
      style={{ marginBottom: 16, ...(item.formItemStyle || {}) }}
    >
      {child}
    </Form.Item>
  );
};

export const clearOptionsCache = () => optionsCache.clear();
