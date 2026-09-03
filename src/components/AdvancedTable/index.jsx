import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Table, ConfigProvider, Tooltip, Pagination } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { FilterFilled, FilterOutlined } from '@ant-design/icons';
import Toolbar from './Toolbar';
import FilterDrawer from './FilterDrawer';
import FilterDropdownBody from './FilterDropdownBody';
import { extractFilterItems } from './utils/formRenderer';

/**
 * ✅ rerender-no-inline-components：FilterIcon 模块级常量
 * 不依赖任何列特定参数，只是根据 filtered boolean 决定图标
 * 避免 displayColumns useMemo 每次 new 闭包导致 antd Table 重渲染
 */
const renderFilterIcon = (filtered) => (
  <Tooltip title={filtered ? '已过滤' : '过滤'}>
    {filtered ? (
      <FilterFilled style={{ color: '#1677ff', fontSize: 12 }} />
    ) : (
      <FilterOutlined style={{ fontSize: 12, color: '#bfbfbf' }} />
    )}
  </Tooltip>
);

/**
 * 高级表格组件 —— 根组件
 *
 * ===============================
 * 统一 Props 入口
 * ===============================
 *
 * 【数据相关】
 * @param {array} columns - 列配置（基于 antd ColumnType，扩展 filter + sort 字段）
 * @param {array} dataSource - 数据源（受控）
 * @param {number} total - 远程模式下的数据总数（配合 manualPagination）
 * @param {boolean} loading - 加载状态（受控）
 * @param {string} rowKey - 行唯一标识字段，默认 'key'
 *
 * 【列 filter 配置 —— 驱动 antd 原生过滤 UI】
 * @param {string} columns[].filter.type - 'select' | 'asyncSelect' | 'dateRange' | 'input'
 * @param {array} columns[].filter.options - 静态选项 [{ label, value }]
 * @param {function} columns[].filter.loadOptions - 异步加载选项 async () => [{ label, value }]
 * @param {string} columns[].filter.placeholder - 占位符
 * @param {function} columns[].filter.onFilter - 自定义行过滤函数 (value, record) => boolean
 *
 * 【排序相关】
 * @param {boolean|function} columns[].sortable - true=默认比较器；函数=自定义 (a,b)=>number
 * @param {string[]} columns[].sortDirections - 循环顺序，默认 ['ascend', 'descend', null]
 * @param {function} onSortChange - 排序变化回调 (sortValues) => void
 * @param {boolean} manualSort - true=跳过自动排序（远程模式）
 *
 * 【过滤相关】
 * @param {function} onFilterChange - 过滤值变化回调 (filterValues) => void
 * @param {boolean} manualFilter - true=跳过自动过滤（远程模式）
 *
 * 【分页相关】
 * @param {object|false} pagination - 分页配置，false 关闭
 * @param {boolean} manualPagination - true=分页由外部驱动（远程模式）
 *
 * 【统一远程查询回调】
 * @param {function} onChange - 远程查询回调 (params) => void
 *   params = { pagination: { current, pageSize }, filters: {...}, sorter: { field, order } }
 *
 * 【工具栏 & 列显隐】
 * @param {React.ReactNode} toolbarLeft - 工具栏左侧 slot
 * @param {React.ReactNode} toolbarRight - 工具栏右侧前置 slot
 * @param {boolean} showFilter - 是否显示抽屉过滤图标，默认 true
 * @param {boolean} showRefresh - 是否显示刷新图标，默认 true
 * @param {boolean} showColumnSettings - 是否显示列设置
 * @param {function} onRefresh - 刷新回调
 * @param {array} defaultVisibleColumnKeys / defaultColumnOrder - 默认列配置
 * @param {function} onColumnChange - 列变化回调
 *
 * 【表格配置】
 * @param {object} tableProps - 透传给 antd Table 的其余 props
 * @param {object} containerStyle - 外层容器样式
 */
const AdvancedTable = ({
  columns: rawColumns,
  dataSource = [],
  total,
  loading = false,
  rowKey = 'key',

  // 过滤
  filterValues: filterValuesProp,
  onFilterChange,
  manualFilter = false,

  // 排序
  sortValues: sortValuesProp,
  defaultSortValues,
  onSortChange,
  manualSort = false,

  // 分页
  pagination,
  manualPagination = false,

  // 统一远程查询（触发在分页/过滤/排序任一变化时）
  onChange: onRemoteChange,

  // 列显隐 & 排序
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
  // ============ 派生数据 ============
  const columnKeyMap = useMemo(() => {
    const map = {};
    rawColumns.forEach((c) => { map[c.key] = c; });
    return map;
  }, [rawColumns]);

  // ✅ 性能优化：按 dataIndex 预建 Map，applyFilter / sortedData 里 O(1) 查找
  const columnDataIndexMap = useMemo(() => {
    const map = new Map();
    rawColumns.forEach((c) => {
      if (c.dataIndex !== undefined) map.set(c.dataIndex, c);
    });
    return map;
  }, [rawColumns]);

  const filterItems = useMemo(() => extractFilterItems(rawColumns), [rawColumns]);

  // ============ 内部状态 ============
  const isControlledFilter = filterValuesProp !== undefined;
  const [internalFilterValues, setInternalFilterValues] = useState({});
  const filterValues = isControlledFilter ? filterValuesProp : internalFilterValues;

  const isControlledSort = sortValuesProp !== undefined;
  const [internalSortValues, setInternalSortValues] = useState(defaultSortValues || { field: null, order: null });
  const sortValues = isControlledSort ? sortValuesProp : internalSortValues;

  const [columnOrder, setColumnOrder] = useState(() =>
    defaultColumnOrder || rawColumns.map((c) => c.key)
  );
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(() =>
    defaultVisibleColumnKeys || rawColumns.map((c) => c.key)
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [innerLoading, setInnerLoading] = useState(false);

  // 分页
  const mergedPaginationConfig = useMemo(() => {
    if (pagination === false) return null;
    if (pagination) {
      return {
        current: 1,
        pageSize: 10,
        ...pagination,
        showSizeChanger: pagination.showSizeChanger ?? true,
        showQuickJumper: pagination.showQuickJumper ?? true,
        pageSizeOptions: pagination.pageSizeOptions ?? ['10', '20', '50', '100'],
      };
    }
    return {
      current: 1,
      pageSize: 10,
      showSizeChanger: true,
      showQuickJumper: true,
      pageSizeOptions: ['10', '20', '50', '100'],
    };
  }, [pagination]);

  const [innerPagination, setInnerPagination] = useState(mergedPaginationConfig);
  useEffect(() => {
    if (pagination !== false) setInnerPagination(mergedPaginationConfig);
  }, [mergedPaginationConfig, pagination]);

  // ============ 核心同步：统一远程回调 ============
  const notifyRemoteChange = useCallback((filters, sort, paginationInfo) => {
    if (onRemoteChange) {
      onRemoteChange({
        pagination: {
          current: paginationInfo.current,
          pageSize: paginationInfo.pageSize,
        },
        filters,
        sorter: {
          field: sort.field,
          order: sort.order,
        },
      });
    }
  }, [onRemoteChange]);

  // ============ 更新过滤值 ============
  const updateFilterValues = useCallback((next) => {
    if (isControlledFilter) {
      onFilterChange?.(next);
    } else {
      setInternalFilterValues(next);
    }
  }, [isControlledFilter, onFilterChange]);

  // ============ 更新排序值 ============
  const updateSortValues = useCallback((next) => {
    if (isControlledSort) {
      onSortChange?.(next);
    } else {
      setInternalSortValues(next);
    }
  }, [isControlledSort, onSortChange]);

  // ============ 过滤逻辑 ============
  const applyFilter = useCallback((list, filters) => {
    if (!list.length || !filters || Object.keys(filters).length === 0) return list;
    return list.filter((row) => {
      for (const [key, value] of Object.entries(filters)) {
        if (value == null || value === '') continue;
        const cellVal = row[key];

        // 数组值（select 多选）
        if (Array.isArray(value)) {
          if (!value.includes(cellVal)) return false;
          continue;
        }
        // 日期范围
        if (typeof value === 'object' && value.start && value.end) {
          if (cellVal < value.start || cellVal > value.end) return false;
          continue;
        }
        // ✅ O(1) 查找 column 定义
        const col = columnDataIndexMap.get(key);
        if (col?.filter?.type === 'input') {
          if (String(cellVal ?? '').toLowerCase().indexOf(String(value).toLowerCase()) === -1) {
            return false;
          }
        } else if (cellVal !== value) {
          return false;
        }
      }
      return true;
    });
  }, [columnDataIndexMap]);

  const filteredData = useMemo(() => {
    if (manualFilter) return dataSource;
    return applyFilter(dataSource, filterValues);
  }, [dataSource, filterValues, manualFilter, applyFilter]);

  // ============ 排序逻辑 ============
  const defaultComparator = useCallback((a, b, field) => {
    const va = a[field];
    const vb = b[field];
    if (va === vb) return 0;
    if (va == null) return -1;
    if (vb == null) return 1;
    if (typeof va === 'number' && typeof vb === 'number') return va - vb;
    return String(va).localeCompare(String(vb), 'zh-CN', { numeric: true });
  }, []);

  const sortedData = useMemo(() => {
    if (manualSort) return filteredData;
    const { field, order } = sortValues;
    if (!field || !order) return filteredData;

    // ✅ O(1) 查找
    const col = columnDataIndexMap.get(field);
    const comparator = col?.sortable && typeof col.sortable === 'function'
      ? col.sortable
      : (a, b) => defaultComparator(a, b, field);

    const sorted = [...filteredData].sort(comparator);
    return order === 'descend' ? sorted.reverse() : sorted;
  }, [filteredData, sortValues, manualSort, columnDataIndexMap, defaultComparator]);

  // ============ 分页数据 ============
  const pagedData = useMemo(() => {
    if (pagination === false || manualPagination) return sortedData;
    const start = ((innerPagination?.current || 1) - 1) * (innerPagination?.pageSize || 10);
    return sortedData.slice(start, start + (innerPagination?.pageSize || 10));
  }, [sortedData, innerPagination, pagination, manualPagination]);

  // ============ antd 原生 onChange → 内部状态同步 ============
  const handleTableChange = useCallback((paginationInfo, antdFilters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;

    // 1. 同步过滤值
    // antdFilters 结构: { [dataIndex]: [val1, val2] | undefined }
    const newFilters = {};
    for (const col of rawColumns) {
      const af = antdFilters[col.dataIndex];
      if (af !== undefined && af !== null && !(Array.isArray(af) && af.length === 0)) {
        newFilters[col.dataIndex] = af;
      }
    }

    // 2. 同步排序值
    const field = s ? (s.field || s.columnKey || null) : null;
    const order = s ? (s.order || null) : null;
    const newSort = { field: order ? field : null, order };

    // 3. 同步分页
    const newPagination = {
      current: paginationInfo.current || innerPagination.current,
      pageSize: paginationInfo.pageSize || innerPagination.pageSize,
    };

    // 更新内部状态
    const nextFilters = { ...filterValues, ...newFilters };
    // 清除值为 undefined/空数组 的项
    Object.keys(nextFilters).forEach((k) => {
      const v = nextFilters[k];
      if (v === null || v === undefined || (Array.isArray(v) && v.length === 0)) {
        delete nextFilters[k];
      }
    });

    const didFilterChange = JSON.stringify(nextFilters) !== JSON.stringify(filterValues);
    const didSortChange = field !== sortValues.field || order !== sortValues.order;
    const didPageChange = newPagination.current !== innerPagination.current || newPagination.pageSize !== innerPagination.pageSize;

    if (didFilterChange) {
      updateFilterValues(nextFilters);
      if (!manualPagination && !manualFilter) {
        setInnerPagination((prev) => ({ ...prev, current: 1 }));
      }
    }
    if (didSortChange) updateSortValues(newSort);
    if (didPageChange && !manualPagination) setInnerPagination(newPagination);

    // 通知远程
    notifyRemoteChange(nextFilters, newSort, {
      current: didPageChange ? newPagination.current : innerPagination.current,
      pageSize: didPageChange ? newPagination.pageSize : innerPagination.pageSize,
    });
  }, [rawColumns, filterValues, sortValues, innerPagination, manualPagination, manualFilter,
      updateFilterValues, updateSortValues, notifyRemoteChange]);

  // ============ 过滤抽屉 → 同步到 antd filters ============
  const handleDrawerSubmit = useCallback((values) => {
    // values 已是 filterValues 格式
    updateFilterValues(values);
    if (!manualPagination) setInnerPagination((prev) => ({ ...prev, current: 1 }));
    notifyRemoteChange(values, sortValues, { current: 1, pageSize: innerPagination.pageSize });
  }, [updateFilterValues, manualPagination, notifyRemoteChange, sortValues, innerPagination.pageSize]);

  const handleDrawerReset = useCallback(() => {
    updateFilterValues({});
    if (!manualPagination) setInnerPagination((prev) => ({ ...prev, current: 1 }));
    notifyRemoteChange({}, sortValues, { current: 1, pageSize: innerPagination.pageSize });
  }, [updateFilterValues, manualPagination, notifyRemoteChange, sortValues, innerPagination.pageSize]);

  // ============ 列过滤值实时同步（FilterDropdownBody onChange 使用）============
  const handleColumnFilterChange = useCallback((dataIndex, val) => {
    const next = { ...filterValues };
    if (val === null || val === undefined || val === '' ||
        (Array.isArray(val) && val.length === 0) ||
        (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0)) {
      delete next[dataIndex];
    } else {
      next[dataIndex] = val;
    }
    updateFilterValues(next);
  }, [filterValues, updateFilterValues]);

  // ============ 快速清除单列过滤（供 displayColumns 引用）============
  const handleColumnQuickClear = useCallback((dataIndex) => {
    const next = { ...filterValues };
    delete next[dataIndex];
    updateFilterValues(next);
    if (!manualPagination && !manualFilter) {
      setInnerPagination((prev) => ({ ...prev, current: 1 }));
    }
  }, [filterValues, updateFilterValues, manualPagination, manualFilter]);

  // ============ 独立 Pagination 的 onChange 适配 ============
  const handlePaginationChange = useCallback((page, pageSize) => {
    if (!manualPagination) {
      setInnerPagination((prev) => {
        const next = { ...prev, current: page, pageSize };
        // 如果 pageSize 变了，current 可能超范围，回到第一页
        const total = filteredData.length;
        const maxPage = Math.max(1, Math.ceil(total / pageSize));
        return { ...next, current: Math.min(page, maxPage) };
      });
    }
    notifyRemoteChange(filterValues, sortValues, { current: page, pageSize });
  }, [manualPagination, filteredData.length, filterValues, sortValues, notifyRemoteChange]);

  // ============ 列渲染：注入 antd 原生 filters ============
  const displayColumns = useMemo(() => {
    const ordered = columnOrder
      .map((key) => columnKeyMap[key])
      .filter((col) => col && visibleColumnKeys.includes(col.key));

    return ordered.map((col) => {
      const isSortable = !!col.sortable;
      const isCurrentSort = sortValues.field === col.dataIndex;
      const hasFilter = !!col.filter;
      const colFilter = col.filter;

      // ============ antd 原生过滤配置 ============
      let antdFilters;
      let antdFilterDropdown;
      let antdFilterIcon;

      // 统一为所有列注入 filteredValue（antd v6 要求全部有或全部无）
      let antdFilteredValue;

      if (hasFilter) {
        const currentVal = filterValues[col.dataIndex];
        antdFilteredValue = currentVal !== undefined && currentVal !== null
          ? (Array.isArray(currentVal) ? currentVal : [currentVal])
          : [];  // 空数组代替 undefined，满足 antd 一致注入的要求

        // ✅ 用模块级常量，避免每次 render new 闭包
        antdFilterIcon = renderFilterIcon;

        if (colFilter.type === 'select' && colFilter.options) {
          // 静态 select → antd 原生 filters 数组
          antdFilters = colFilter.options.map((o) => ({ text: o.label, value: o.value }));
        } else {
          // dateRange / input / asyncSelect / 自定义 → 用 filterDropdown
          antdFilterDropdown = ({ confirm, close }) => (
            <FilterDropdownBody
              filter={colFilter}
              value={currentVal}
              onChange={(val) => handleColumnFilterChange(col.dataIndex, val)}
              onConfirm={() => { confirm(); close(); }}
              onReset={() => {
                handleColumnQuickClear(col.dataIndex);
                close();
              }}
            />
          );
        }
      } else {
        // 不可过滤列也注入空数组，保持 antd 一致
        antdFilteredValue = [];
      }

      return {
        ...col,
        title: col.title,
        sorter: isSortable ? true : col.sorter,
        sortOrder: isSortable ? (isCurrentSort ? sortValues.order : null) : col.sortOrder,
        sortDirections: col.sortDirections || ['ascend', 'descend', null],
        showSorterTooltip: col.showSorterTooltip ?? false,
        // antd 原生过滤（全部列统一注入 filteredValue）
        filters: antdFilters,
        filterDropdown: antdFilterDropdown,
        filterIcon: antdFilterIcon,
        filteredValue: antdFilteredValue,
        onFilter: false, // 统一 false，由我们手动 applyFilter
        filterMultiple: colFilter?.type === 'select' || colFilter?.type === 'asyncSelect',
      };
    });
  }, [columnOrder, visibleColumnKeys, columnKeyMap, filterValues, sortValues,
      manualPagination, manualFilter, updateFilterValues,
      handleColumnQuickClear, handleColumnFilterChange]);

  // ============ 列设置 ============
  const handleColumnChange = useCallback((newOrder, newVisibleKeys) => {
    setColumnOrder(newOrder);
    setVisibleColumnKeys(newVisibleKeys);
    onColumnChange?.(newOrder, newVisibleKeys);
  }, [onColumnChange]);

  // ============ 刷新 ============
  const mergedLoading = loading || innerLoading;
  const handleRefresh = useCallback(() => {
    if (onRefresh) { onRefresh(); return; }
    setInnerLoading(true);
    setTimeout(() => setInnerLoading(false), 500);
  }, [onRefresh]);

  // ============ 分页配置 ============
  const antdPagination = useMemo(() => {
    if (pagination === false) return false;
    const currentTotal = manualPagination
      ? (total ?? innerPagination.total ?? 0)
      : filteredData.length;

    return {
      ...innerPagination,
      total: currentTotal,
      showTotal: (t, range) => `共 ${t} 条，当前显示第 ${range[0]}-${range[1]} 条`,
    };
  }, [innerPagination, pagination, manualPagination, total, filteredData.length]);

  // ============ Table 区域高度自适应 ============
  // pagination 已拆出为独立组件放在外层 flex 底部，这里 scrollY 就是容器高度
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
    compute();  // 立即算一次
    return () => ro.disconnect();
  }, []);

  // ============ 渲染 ============
  return (
    <ConfigProvider locale={zhCN}>
      {/* 外层：100% 高度 + flex 纵向布局 */}
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
        {/* Toolbar：自然高度 */}
        <Toolbar
          columns={columnOrder.map((k) => columnKeyMap[k]).filter(Boolean)}
          visibleColumnKeys={visibleColumnKeys}
          onColumnChange={showColumnSettings ? handleColumnChange : undefined}
          onFilterClick={showFilter ? () => setDrawerOpen(true) : undefined}
          onRefresh={showRefresh ? handleRefresh : undefined}
          leftSlot={toolbarLeft}
          rightSlot={toolbarRight}
        />

        {/* ✅ Table 区域：flex:1 自动填满剩余空间，内部表体滚动 */}
        <div
          ref={tableContainerRef}
          style={{
            flex: 1,
            minHeight: 0,
            borderTop: '1px solid #f0f0f0',
            overflow: 'hidden',   // 把 Table + 其 pagination 一起裁掉（因为我们要用独立的 Pagination）
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

        {/* ✅ 独立 Pagination：flex-shrink:0 永远显示在底部 */}
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
              current={antdPagination.current ?? innerPagination.current}
              pageSize={antdPagination.pageSize ?? innerPagination.pageSize}
              onChange={handlePaginationChange}
              showSizeChanger={antdPagination.showSizeChanger ?? true}
              showQuickJumper={antdPagination.showQuickJumper ?? true}
            />
          </div>
        )}

        <FilterDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          filterItems={filterItems}
          filterValues={filterValues}
          onSubmit={handleDrawerSubmit}
          onReset={handleDrawerReset}
        />
      </div>
    </ConfigProvider>
  );
};

export default AdvancedTable;
