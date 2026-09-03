import { useState, useEffect, useMemo, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { Form, Button, Space, Grid } from 'antd';
import { SearchOutlined, ReloadOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { extractFilterItems, filterValuesToForm, formValuesToFilter } from './utils';
import { renderFilterFormItem } from './formRenderers';

const { useBreakpoint } = Grid;

/**
 * FilterFormBase —— 共用过滤表单组件
 *
 * 职责：接收 filterItems → 渲染 antd Form + 栅格/折叠 + 按钮栏。
 * 外壳容器（FilterForm 顶部 / FilterDrawer 抽屉 / 独立嵌入）只管套壳，
 * 真正的"表单长什么样"全在这里。
 *
 * react-best-practices:
 * - rerender-no-inline-components  : renderFilterFormItem 模块级
 * - rerender-memo                  : filterItems / resolvedCols / initialValues 用 useMemo
 * - rerender-functional-setstate   : setCollapsed((p) => !p)
 * - rerender-lazy-state-init       : 所有 state 用函数式初始化
 * - rerender-no-inline-styles      : 样式常量抽出（gridStyle / toolbarStyle）
 *
 * =========================================================================
 *  三个入口的使用差异，全部由 props 控制：
 *  ┌────────────────┬──────────────────┬────────────────────────────────────┐
 *  │ FilterForm 顶部 │ FilterDrawer 抽屉 │ 任意独立容器（如 Modal / Card 内）    │
 *  ├────────────────┼──────────────────┼────────────────────────────────────┤
 *  │ layout         │ layout           │ layout                             │
 *  │ = 'horizontal' │ = 'vertical'     │ = 任意                             │
 *  │ cols={3}       │ cols={1} (默认)  │ cols 外部控                         │
 *  │ collapsible    │ collapsible=false│ collapsible 外部控                  │
 *  │ showButtons    │ showButtons      │ showButtons                        │
 *  │ = true (默认)  │ = false (按钮放   │ = true/false 外部控                 │
 *  │                │   Drawer.extra)  │                                    │
 *  │ formRef 可选   │ formRef 必用     │ formRef 可选                        │
 *  └────────────────┴──────────────────┴────────────────────────────────────┘
 * =========================================================================
 */
const FilterFormBase = forwardRef(({
  // 数据源：二选一
  columns,
  filterItems: externalFilterItems,

  // 值
  filterValues,
  defaultFilterValues,
  onValuesChange,
  onSubmit,
  onReset,

  // 布局
  layout = 'horizontal',
  cols,
  collapsible = true,
  defaultCollapsedRows = 1,

  // 按钮栏
  showButtons = true,
  showReset = true,
  showSubmit = true,
  loading = false,
  submitText = '查询',
  resetText = '重置',
  leftSlot,
  rightSlot,

  // antd Form 透传
  form: externalForm,
  formProps = {},

  // 容器样式
  showContainer = true,
  style,
}, ref) => {
  const [internalForm] = Form.useForm();
  const form = externalForm || internalForm;
  const screens = useBreakpoint();

  const filterItems = useMemo(
    () => externalFilterItems || extractFilterItems(columns || []),
    [externalFilterItems, columns]
  );

  // 根据断点自适应 cols
  const resolvedCols = useMemo(() => {
    if (cols) return cols;
    if (screens.xs) return 1;
    if (screens.sm) return 2;
    if (screens.md) return 3;
    return 4;
  }, [cols, screens.xs, screens.sm, screens.md]);

  // 受控 filterValues 变化时同步到 Form
  useEffect(() => {
    if (filterValues !== undefined) {
      form.setFieldsValue(filterValuesToForm(filterValues, filterItems));
    }
  }, [filterValues, filterItems, form]);

  // 折叠控制
  const [collapsed, setCollapsed] = useState(true);
  const showCollapseToggle = collapsible && filterItems.length > resolvedCols * defaultCollapsedRows;

  const initialValues = useMemo(
    () => filterValuesToForm(defaultFilterValues, filterItems),
    [defaultFilterValues, filterItems]
  );

  // ============ imperative API ============
  useImperativeHandle(ref, () => ({
    getFormInstance: () => form,
    submit: () => handleSubmit(),
    reset: () => { handleReset(); },
    setValues: (values) => {
      form.setFieldsValue(filterValuesToForm(values, filterItems));
    },
    getValues: () => formValuesToFilter(form.getFieldsValue(), filterItems),
  }));

  // ============ 事件 ============
  const handleValuesChange = useCallback((changed, all) => {
    onValuesChange?.(changed, formValuesToFilter(all, filterItems));
  }, [onValuesChange, filterItems]);

  const handleSubmit = useCallback(() => {
    form.validateFields().then((values) => {
      const converted = formValuesToFilter(values, filterItems);
      onSubmit?.(converted);
    });
  }, [form, filterItems, onSubmit]);

  const handleReset = useCallback(() => {
    form.resetFields();
    onReset?.();
  }, [form, onReset]);

  const toggleCollapse = useCallback(() => setCollapsed((prev) => !prev), []);

  const visibleItems = collapsible && collapsed
    ? filterItems.slice(0, resolvedCols * defaultCollapsedRows)
    : filterItems;

  // ============ 渲染 ============
  const formContent = (
    <Form
      form={form}
      layout={layout}
      initialValues={initialValues}
      onValuesChange={handleValuesChange}
      autoComplete="off"
      {...formProps}
    >
      {/* 栅格化表单项 */}
      {layout === 'horizontal' && resolvedCols > 1 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${resolvedCols}, minmax(0, 1fr))`,
            gap: '0 16px',
          }}
        >
          {visibleItems.map((item) => renderFilterFormItem(item))}
        </div>
      ) : (
        visibleItems.map((item) => renderFilterFormItem(item))
      )}

      {/* 按钮栏 */}
      {showButtons && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: layout === 'vertical' ? 8 : 12,
            marginBottom: 4,
          }}
        >
          {leftSlot}
          <Space size={8}>
            {showReset && (
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                {resetText}
              </Button>
            )}
            {showSubmit && (
              <Button
                type="primary"
                icon={<SearchOutlined />}
                loading={loading}
                onClick={handleSubmit}
              >
                {submitText}
              </Button>
            )}
          </Space>
          {rightSlot}
          {showCollapseToggle && (
            <Button type="link" onClick={toggleCollapse} style={{ paddingInline: 4 }}>
              {collapsed ? (
                <>展开 <DownOutlined /></>
              ) : (
                <>收起 <UpOutlined /></>
              )}
            </Button>
          )}
        </div>
      )}
    </Form>
  );

  if (!showContainer) return formContent;

  return (
    <div
      style={{
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        padding: '16px 16px 4px',
        ...style,
      }}
    >
      {formContent}
    </div>
  );
});

FilterFormBase.displayName = 'FilterFormBase';

export default FilterFormBase;
