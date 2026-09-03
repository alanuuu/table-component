import FilterFormBase from './FilterFormBase';

/**
 * FilterForm —— 顶部查询表单（薄壳子，全部能力来自 FilterFormBase）
 *
 * 与 ProTable 共用 columns[].filter 配置：
 *   columns → extractFilterItems → FilterFormBase → Form
 */
const FilterForm = ({
  // columns / filterItems 二选一
  columns,
  filterItems,

  // 值
  filterValues,
  defaultFilterValues,
  onValuesChange,
  onSubmit,
  onReset,

  // 布局（顶部条默认 horizontal + 自适应 cols）
  layout = 'horizontal',
  cols,
  collapsible = true,
  defaultCollapsedRows = 1,

  // 按钮
  loading = false,
  submitText = '查询',
  resetText = '重置',

  // slot
  leftSlot,
  rightSlot,

  // 透传
  formProps = {},
  style,
  ...rest
}) => (
  <FilterFormBase
    columns={columns}
    filterItems={filterItems}
    filterValues={filterValues}
    defaultFilterValues={defaultFilterValues}
    onValuesChange={onValuesChange}
    onSubmit={onSubmit}
    onReset={onReset}
    layout={layout}
    cols={cols}
    collapsible={collapsible}
    defaultCollapsedRows={defaultCollapsedRows}
    loading={loading}
    submitText={submitText}
    resetText={resetText}
    leftSlot={leftSlot}
    rightSlot={rightSlot}
    formProps={formProps}
    style={style}
    {...rest}
  />
);

export default FilterForm;
