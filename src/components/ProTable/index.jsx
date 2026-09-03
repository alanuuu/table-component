import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Table, Pagination, Tooltip } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import Toolbar from './Toolbar';
import ColumnFilter from './ColumnFilter';
import FilterDrawer from './FilterDrawer';
import { useProTable } from './useProTable';
import { extractFilterItems, isEmptyFilterValue } from './utils';

const getFilterOptionLabels = (options = [], values) => {
  const valueList = Array.isArray(values) ? values : [values];
  const flattenedOptions = options.flatMap((option) => [
    option,
    ...(option.children ? getFilterOptionObjects(option.children) : []),
  ]);

  return valueList.map((value) => {
    const option = flattenedOptions.find((item) => item.value === value);
    return option?.label ?? String(value);
  });
};

const getFilterOptionObjects = (options = []) => options.flatMap((option) => [
  option,
  ...(option.children ? getFilterOptionObjects(option.children) : []),
]);

const getFilterTooltip = (value, filter) => {
  if (isEmptyFilterValue(value)) return '查询';
  if (filter?.type === 'dateRange' && value.start && value.end) {
    return `${value.start} ~ ${value.end}`;
  }
  if (filter?.options || filter?.treeData) {
    return getFilterOptionLabels(filter.options || filter.treeData, value).join(', ');
  }
  return Array.isArray(value) ? value.join(', ') : String(value);
};

/**
 * ProTable —— 基于 antd 的高级表格组件（新一代）
 *
 * ======================================================================
 *                                设计理念
 * ======================================================================
 *  1. 组合式架构：核心逻辑抽离到 useProTable Hook，UI 子组件各司其职
 *  2. 最大复用 antd：Table / Drawer / Popover / Dropdown / Pagination
 *  3. 双模式支持：本地自动处理过滤排序分页，远程模式统一 onChange 通知
 *  4. 列驱动配置：columns 上挂 filter / sortable 即可，不用单独传过滤配置
 *  5. 可定制性：tableProps 全量透传 antd Table，满足 rowSelection / expandable 等
 *
 * ======================================================================
 *                                Props 详解
 * ======================================================================
 *
 *  ---------- 数据相关 ----------
 *  @param {ColumnType[]} columns
 *      列配置，在 antd ColumnType 基础上扩展两个字段：
 *      - filter    {Object} 过滤配置，详见下方「过滤类型」
 *      - sortable  {boolean | (a,b)=>number}  true=默认比较器；函数=自定义
 *
 *  @param {Array} dataSource    数据源（本地模式直接传入；远程模式传当前页数据）
 *  @param {number} total        远程模式下的数据总数
 *  @param {boolean} loading     加载状态
 *  @param {string} rowKey       行唯一标识字段，默认 'key'
 *
 *  ---------- 过滤 ----------
 *  @param {Object}  filterValues        当前过滤值（受控）
 *  @param {Object}  defaultFilterValues 默认过滤值（非受控）
 *  @param {Function} onFilterChange     过滤变化回调 (values) => void
 *  @param {boolean} manualFilter        true=跳过本地自动过滤（远程模式用）
 *
 *  ---------- 排序 ----------
 *  @param {Object}  sortValues          { field, order }（受控）
 *  @param {Object}  defaultSortValues   默认排序值
 *  @param {Function} onSortChange       排序变化回调 (values) => void
 *  @param {boolean} manualSort          true=跳过本地自动排序
 *
 *  ---------- 分页 ----------
 *  @param {Object|false} pagination     分页配置对象，false 关闭分页
 *      支持字段：current / pageSize / showSizeChanger / showQuickJumper / pageSizeOptions
 *  @param {boolean} manualPagination    true=分页由外部驱动
 *
 *  ---------- 统一远程回调 ----------
 *  @param {Function} onChange           分页/过滤/排序任一变化时触发
 *      (params) => void
 *      params = { pagination: { current, pageSize }, filters: {...}, sorter: { field, order } }
 *
 *  ---------- 列显隐 / 排序 ----------
 *  @param {string[]} defaultVisibleColumnKeys  默认可见列 key
 *  @param {string[]} defaultColumnOrder        默认列顺序 key 数组
 *  @param {Function} onColumnChange            列变更回调 (order, visibleKeys) => void
 *
 *  ---------- 工具栏 ----------
 *  @param {ReactNode} toolbarLeft      工具栏左侧 slot（通常放业务按钮）
 *  @param {ReactNode} toolbarRight     工具栏右侧前置 slot
 *  @param {boolean}   showFilter       是否显示过滤图标，默认 true
 *  @param {boolean}   showRefresh      是否显示刷新图标，默认 true
 *  @param {boolean}   showColumnSettings 是否显示列设置图标，默认 true
 *  @param {Function}  onRefresh       刷新回调
 *
 *  ---------- 表格透传 ----------
 *  @param {Object} tableProps          透传给 antd Table 的 props
 *      常用：rowSelection / expandable / rowClassName / size / bordered 等
 *
 *  @param {Object} containerStyle      外层容器样式覆盖
 *
 *  ======================================================================
 *                           columns[].filter 过滤类型
 *  ======================================================================
 *
 *  | type          | 说明                     | 额外配置                          |
 *  |---------------|--------------------------|----------------------------------|
 *  | select        | 单选（antd 原生复选框）  | options: [{label,value}]        |
 *  | multiSelect   | 多选（平铺 Checkbox）     | options 或 loadOptions 异步      |
 *  | asyncSelect   | 同 multiSelect 别名       | loadOptions(keyword)             |
 *  | treeSelect    | 树形多选                 | treeData / loadTreeData(node)    |
 *  | dateRange     | 日期范围                 | —                                |
 *  | input         | 模糊搜索                 | —                                |
 *  | inputNumber   | 数字输入（抽屉内）       | —                                |
 *  | switch        | 开关（抽屉内）           | —                                |
 *
 *  ======================================================================
 *                                使用示例
 *  ======================================================================
 *
 *  import ProTable from './components/ProTable';
 *
 *  const columns = [
 *    { title: '名称', dataIndex: 'name', key: 'name', sortable: true,
 *      filter: { type: 'input', placeholder: '搜索名称' } },
 *    { title: '类型', dataIndex: 'type', key: 'type',
 *      filter: { type: 'select', options: [{label:'A',value:'A'},...] } },
 *    { title: '日期', dataIndex: 'date', key: 'date', sortable: true,
 *      filter: { type: 'dateRange' } },
 *  ];
 *
 *  <ProTable
 *    columns={columns}
 *    dataSource={localData}
 *    rowKey="id"
 *    toolbarLeft={<Button type="primary">新增</Button>}
 *    onChange={(p) => console.log(p)}
 *    pagination={{ pageSize: 20 }}
 *    tableProps={{ bordered: true }}
 *  />
 */
const ProTable = ({
  columns,
  dataSource = [],
  total,
  loading = false,
  rowKey = 'key',

  // 过滤
  filterValues,
  defaultFilterValues,
  onFilterChange,
  manualFilter = false,

  // 排序
  sortValues,
  defaultSortValues,
  onSortChange,
  manualSort = false,

  // 分页
  pagination,
  manualPagination = false,

  // 远程统一回调
  onChange: onRemoteChange,

  // 列显隐 / 排序
  defaultVisibleColumnKeys,
  defaultColumnOrder,
  onColumnChange,

  // 工具栏
  toolbarLeft,
  toolbarRight,
  showFilter = true,
  showRefresh = true,
  showColumnSettings = true,
  onRefresh,

  // 表格
  tableProps = {},
  containerStyle,
}) => {
  // ============ 核心 Hook ============
  const state = useProTable({
    columns,
    dataSource,
    total,
    rowKey,
    filterValues, defaultFilterValues, onFilterChange, manualFilter,
    sortValues, defaultSortValues, onSortChange, manualSort,
    pagination, manualPagination,
    onChange: onRemoteChange,
    defaultVisibleColumnKeys, defaultColumnOrder, onColumnChange,
  });

  const {
    filterValues: curFilterValues,
    sortValues: curSortValues,
    columnOrder,
    visibleColumnKeys,
    filteredData,
    pagedData,
    displayColumns: baseDisplayColumns,
    antdPagination,
    columnKeyMap,
    handleTableChange,
    handleColumnFilterChange,
    handleClearColumnFilter,
    handlePaginationChange,
    handleColumnChange,
    handleDrawerSubmit,
    handleDrawerReset,
  } = state;

  // ============ 抽屉显隐 ============
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [innerLoading, setInnerLoading] = useState(false);

  // ============ 刷新 ============
  const mergedLoading = loading || innerLoading;
  const handleRefresh = useCallback(() => {
    if (onRefresh) { onRefresh(); return; }
    setInnerLoading(true);
    setTimeout(() => setInnerLoading(false), 500);
  }, [onRefresh]);
  // ============ 注入 antd 列过滤配置 ============
  const displayColumns = useMemo(() => {
    const renderFilterIcon = (col) => () => {
      const value = curFilterValues?.[col.dataIndex];
      const filtered = !isEmptyFilterValue(value);

      return <Tooltip title={getFilterTooltip(value, col.filter)} mouseEnterDelay={0.5}>
        {filtered ? (
          <SearchOutlined style={{ color: '#1677ff', fontSize: 12 }} />
        ) : (
          <SearchOutlined style={{ fontSize: 12, color: '#bfbfbf' }} />
        )}
      </Tooltip>
    };


    return baseDisplayColumns.map((col) => {
      const colFilter = col.filter;
      if (!colFilter) {
        return { ...col, filterIcon: renderFilterIcon(col) };
      }

      // select 类型 → 走 antd 原生 filters 复选框
      if (colFilter.type === 'select' && colFilter.options) {
        return {
          ...col,
          filters: colFilter.options.map((o) => ({ text: o.label, value: o.value })),
          filterIcon: renderFilterIcon(col),
        };
      }

      // 其他类型 → 自定义 filterDropdown
      return {
        ...col,
        filterIcon: renderFilterIcon(col),
        filterDropdown: ({ confirm, close }) => (
          <ColumnFilter
            filter={colFilter}
            value={curFilterValues[col.dataIndex]}
            onChange={(val) => handleColumnFilterChange(col.dataIndex, val)}
            onConfirm={() => { confirm(); close(); }}
            onReset={() => { handleClearColumnFilter(col.dataIndex); close(); }}
          />
        ),
      };
    });
  }, [baseDisplayColumns, curFilterValues, handleColumnFilterChange, handleClearColumnFilter]);

  // ============ Table 区域高度自适应 ============
  const tableContainerRef = useRef(null);
  const [scrollY, setScrollY] = useState(undefined);

  useEffect(() => {
    const el = tableContainerRef.current;
    if (!el) return;
    const compute = () => {
      const h = el.clientHeight;
      if (h > 0) setScrollY(Math.max(h - 2, 200));
    };
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    compute();
    return () => ro.disconnect();
  }, []);

  // ============ 抽屉 filterItems ============
  const filterItems = useMemo(() => extractFilterItems(columns), [columns]);

  // ============ 渲染 ============
  return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          background: '#fff',
          borderRadius: 8,
          overflow: 'hidden',
          ...containerStyle,
        }}
      >
        {/* 工具栏 */}
        <Toolbar
          columns={columnOrder.map((k) => columnKeyMap[k]).filter(Boolean)}
          visibleColumnKeys={visibleColumnKeys}
          onColumnChange={showColumnSettings ? handleColumnChange : undefined}
          onFilterClick={showFilter ? () => setDrawerOpen(true) : undefined}
          onRefresh={showRefresh ? handleRefresh : undefined}
          leftSlot={toolbarLeft}
          rightSlot={toolbarRight}
        />

        {/* Table 区域 */}
        <div
          ref={tableContainerRef}
          style={{
            flex: 1,
            minHeight: 0,
            borderTop: '1px solid #f0f0f0',
            overflow: 'hidden',
          }}
        >
          <Table
            rowKey={rowKey}
            loading={mergedLoading}
            columns={displayColumns}
            dataSource={manualPagination ? dataSource : pagedData}
            size="middle"
            scroll={{ x: 'max-content', y: scrollY }}
            pagination={false}
            sortDirections={['ascend', 'descend', null]}
            onHeaderRow={() => ({ style: { background: '#fafafa' } })}
            onChange={handleTableChange}
            {...tableProps}
          />
        </div>

        {/* 独立 Pagination */}
        {antdPagination !== false && (
          <div
            style={{
              flexShrink: 0,
              padding: '8px 16px',
              borderTop: '1px solid #f0f0f0',
              background: '#fafafa',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <Pagination
              {...antdPagination}
              current={antdPagination.current ?? state.innerPagination.current}
              pageSize={antdPagination.pageSize ?? state.innerPagination.pageSize}
              onChange={handlePaginationChange}
              showSizeChanger={antdPagination.showSizeChanger ?? true}
              showQuickJumper={antdPagination.showQuickJumper ?? true}
            />
          </div>
        )}

        {/* 全局过滤抽屉 */}
        <FilterDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          filterItems={filterItems}
          filterValues={curFilterValues}
          onSubmit={handleDrawerSubmit}
          onReset={handleDrawerReset}
        />
      </div>
  );
};

export default ProTable;
