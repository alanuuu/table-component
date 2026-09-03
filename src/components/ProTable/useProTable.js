import { useState, useMemo, useCallback, useEffect } from 'react';
import { buildColumnKeyMap, buildColumnDataIndexMap, defaultComparator, isEmptyFilterValue } from './utils';

/**
 * ProTable 核心状态管理 Hook
 *
 * 职责：
 * 1. 过滤值（受控/非受控）
 * 2. 排序值（受控/非受控）
 * 3. 列显隐 & 排序
 * 4. 分页状态
 * 5. 本地数据过滤/排序/分页
 * 6. 统一远程查询通知
 */
export const useProTable = ({
  columns = [],
  dataSource = [],
  total,
  rowKey = 'key',

  // 过滤
  filterValues: filterValuesProp,
  defaultFilterValues,
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

  // 远程统一回调
  onChange: onRemoteChange,

  // 列显隐排序
  defaultVisibleColumnKeys,
  defaultColumnOrder,
  onColumnChange,
}) => {
  // ============ 派生数据 ============
  const columnKeyMap = useMemo(() => buildColumnKeyMap(columns), [columns]);
  const columnDataIndexMap = useMemo(() => buildColumnDataIndexMap(columns), [columns]);

  // ============ 过滤状态 ============
  const isFilterControlled = filterValuesProp !== undefined;
  const [internalFilterValues, setInternalFilterValues] = useState(defaultFilterValues || {});
  const filterValues = isFilterControlled ? filterValuesProp : internalFilterValues;

  const updateFilterValues = useCallback((next) => {
    if (isFilterControlled) {
      onFilterChange?.(next);
    } else {
      setInternalFilterValues(next);
    }
  }, [isFilterControlled, onFilterChange]);

  // ============ 排序状态 ============
  const isSortControlled = sortValuesProp !== undefined;
  const [internalSortValues, setInternalSortValues] = useState(
    defaultSortValues || { field: null, order: null }
  );
  const sortValues = isSortControlled ? sortValuesProp : internalSortValues;

  const updateSortValues = useCallback((next) => {
    if (isSortControlled) {
      onSortChange?.(next);
    } else {
      setInternalSortValues(next);
    }
  }, [isSortControlled, onSortChange]);

  // ============ 列配置 ============
  const [columnOrder, setColumnOrder] = useState(
    () => defaultColumnOrder || columns.map((c) => c.key)
  );
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(
    () => defaultVisibleColumnKeys || columns.map((c) => c.key)
  );

  // ============ 分页 ============
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

  // ============ 远程通知 ============
  const notifyRemoteChange = useCallback((filters, sort, paginationInfo) => {
    if (onRemoteChange) {
      onRemoteChange({
        pagination: { current: paginationInfo.current, pageSize: paginationInfo.pageSize },
        filters,
        sorter: { field: sort.field, order: sort.order },
      });
    }
  }, [onRemoteChange]);

  // ============ 本地过滤 ============
  const applyFilter = useCallback((list, filters) => {
    if (!list.length || !filters || Object.keys(filters).length === 0) return list;
    return list.filter((row) => {
      for (const [key, value] of Object.entries(filters)) {
        if (value == null || value === '') continue;
        const cellVal = row[key];

        if (Array.isArray(value)) {
          if (!value.includes(cellVal)) return false;
          continue;
        }
        if (typeof value === 'object' && value.start && value.end) {
          if (cellVal < value.start || cellVal > value.end) return false;
          continue;
        }
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

  // ============ 本地排序 ============
  const sortedData = useMemo(() => {
    if (manualSort) return filteredData;
    const { field, order } = sortValues;
    if (!field || !order) return filteredData;

    const col = columnDataIndexMap.get(field);
    const comparator = col?.sortable && typeof col.sortable === 'function'
      ? col.sortable
      : (a, b) => defaultComparator(a, b, field);

    const sorted = [...filteredData].sort(comparator);
    return order === 'descend' ? sorted.reverse() : sorted;
  }, [filteredData, sortValues, manualSort, columnDataIndexMap]);

  // ============ 分页数据 ============
  const pagedData = useMemo(() => {
    if (pagination === false || manualPagination) return sortedData;
    const start = ((innerPagination?.current || 1) - 1) * (innerPagination?.pageSize || 10);
    return sortedData.slice(start, start + (innerPagination?.pageSize || 10));
  }, [sortedData, innerPagination, pagination, manualPagination]);

  // ============ antd Table onChange 适配 ============
  const handleTableChange = useCallback((paginationInfo, antdFilters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;

    // 过滤值同步
    const newFilters = {};
    for (const col of columns) {
      const af = antdFilters[col.dataIndex];
      if (af !== undefined && af !== null && !(Array.isArray(af) && af.length === 0)) {
        newFilters[col.dataIndex] = af;
      }
    }

    // 排序值同步
    const field = s ? (s.field || s.columnKey || null) : null;
    const order = s ? (s.order || null) : null;
    const newSort = { field: order ? field : null, order };

    // 分页
    const newPagination = {
      current: paginationInfo.current || innerPagination.current,
      pageSize: paginationInfo.pageSize || innerPagination.pageSize,
    };

    const nextFilters = { ...filterValues, ...newFilters };
    Object.keys(nextFilters).forEach((k) => {
      if (isEmptyFilterValue(nextFilters[k])) delete nextFilters[k];
    });

    const didFilterChange = JSON.stringify(nextFilters) !== JSON.stringify(filterValues);
    const didSortChange = field !== sortValues.field || order !== sortValues.order;
    const didPageChange = newPagination.current !== innerPagination.current
      || newPagination.pageSize !== innerPagination.pageSize;

    if (didFilterChange) {
      updateFilterValues(nextFilters);
      if (!manualPagination && !manualFilter) {
        setInnerPagination((prev) => ({ ...prev, current: 1 }));
      }
    }
    if (didSortChange) updateSortValues(newSort);
    if (didPageChange && !manualPagination) setInnerPagination(newPagination);

    notifyRemoteChange(
      didFilterChange ? nextFilters : filterValues,
      didSortChange ? newSort : sortValues,
      {
        current: didPageChange ? newPagination.current : innerPagination.current,
        pageSize: didPageChange ? newPagination.pageSize : innerPagination.pageSize,
      }
    );
  }, [columns, filterValues, sortValues, innerPagination, manualPagination, manualFilter,
      updateFilterValues, updateSortValues, notifyRemoteChange]);

  // ============ 列过滤变更 ============
  const handleColumnFilterChange = useCallback((dataIndex, val) => {
    const next = { ...filterValues };
    if (isEmptyFilterValue(val)) {
      delete next[dataIndex];
    } else {
      next[dataIndex] = val;
    }
    updateFilterValues(next);
  }, [filterValues, updateFilterValues]);

  // ============ 清除单列过滤 ============
  const handleClearColumnFilter = useCallback((dataIndex) => {
    const next = { ...filterValues };
    delete next[dataIndex];
    updateFilterValues(next);
    if (!manualPagination && !manualFilter) {
      setInnerPagination((prev) => ({ ...prev, current: 1 }));
    }
  }, [filterValues, updateFilterValues, manualPagination, manualFilter]);

  // ============ 分页变更 ============
  const handlePaginationChange = useCallback((page, pageSize) => {
    if (!manualPagination) {
      setInnerPagination((prev) => {
        const next = { ...prev, current: page, pageSize };
        const total = filteredData.length;
        const maxPage = Math.max(1, Math.ceil(total / pageSize));
        return { ...next, current: Math.min(page, maxPage) };
      });
    }
    notifyRemoteChange(filterValues, sortValues, { current: page, pageSize });
  }, [manualPagination, filteredData.length, filterValues, sortValues, notifyRemoteChange]);

  // ============ 列变更 ============
  const handleColumnChange = useCallback((newOrder, newVisibleKeys) => {
    setColumnOrder(newOrder);
    setVisibleColumnKeys(newVisibleKeys);
    onColumnChange?.(newOrder, newVisibleKeys);
  }, [onColumnChange]);

  // ============ 全局过滤抽屉 ============
  const handleDrawerSubmit = useCallback((values) => {
    updateFilterValues(values);
    if (!manualPagination) setInnerPagination((prev) => ({ ...prev, current: 1 }));
    notifyRemoteChange(values, sortValues, {
      current: 1,
      pageSize: innerPagination.pageSize,
    });
  }, [updateFilterValues, manualPagination, notifyRemoteChange, sortValues, innerPagination.pageSize]);

  const handleDrawerReset = useCallback(() => {
    updateFilterValues({});
    if (!manualPagination) setInnerPagination((prev) => ({ ...prev, current: 1 }));
    notifyRemoteChange({}, sortValues, {
      current: 1,
      pageSize: innerPagination.pageSize,
    });
  }, [updateFilterValues, manualPagination, notifyRemoteChange, sortValues, innerPagination.pageSize]);

  // ============ antd 分页配置 ============
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

  // ============ 组装后的显示列 ============
  const displayColumns = useMemo(() => {
    const ordered = columnOrder
      .map((key) => columnKeyMap[key])
      .filter((col) => col && visibleColumnKeys.includes(col.key));

    return ordered.map((col) => {
      const isSortable = !!col.sortable;
      const isCurrentSort = sortValues.field === col.dataIndex;
      const colFilter = col.filter;

      return {
        ...col,
        sorter: isSortable ? true : col.sorter,
        sortOrder: isSortable ? (isCurrentSort ? sortValues.order : null) : col.sortOrder,
        sortDirections: col.sortDirections || ['ascend', 'descend', null],
        showSorterTooltip: col.showSorterTooltip ?? false,
        filteredValue: filterValues[col.dataIndex] ?? [],
        onFilter: false,
        filterMultiple: colFilter?.type === 'multiSelect' || colFilter?.type === 'asyncSelect',
      };
    });
  }, [columnOrder, visibleColumnKeys, columnKeyMap, filterValues, sortValues]);

  return {
    // 状态
    filterValues,
    sortValues,
    columnOrder,
    visibleColumnKeys,
    innerPagination,

    // 派生数据
    filteredData,
    sortedData,
    pagedData,
    displayColumns,
    antdPagination,

    // 列映射
    columnKeyMap,
    columnDataIndexMap,

    // 回调
    handleTableChange,
    handleColumnFilterChange,
    handleClearColumnFilter,
    handlePaginationChange,
    handleColumnChange,
    handleDrawerSubmit,
    handleDrawerReset,
  };
};
