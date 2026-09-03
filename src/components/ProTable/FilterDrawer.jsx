import { useMemo } from 'react';
import { Drawer, Form, Button, Space } from 'antd';
import FilterFormBase from './FilterFormBase';
import { extractFilterItems, formValuesToFilter } from './utils';

/**
 * FilterDrawer —— 右侧过滤抽屉（薄壳子，共用 FilterFormBase）
 *
 * Drawer 壳子负责：打开/关闭/位置/大小/按钮栏
 * FilterFormBase 负责：filterItems → Form + 控件渲染 + 值转换
 *
 * 三者共用 FilterFormBase：
 *   FilterForm 顶部查询条        → layout='horizontal', showButtons=true, showContainer=true
 *   FilterDrawer 抽屉             → layout='vertical',   showButtons=false, showContainer=false, 按钮放 Drawer.extra
 *   任意独立容器                  → 组合 props 任意搭配
 */
const FilterDrawer = ({
  open,
  onClose,
  columns,
  filterItems: externalFilterItems,
  filterValues,
  onSubmit,
  onReset,
  title = '查询条件',
  size = 420,
}) => {
  const [form] = Form.useForm();

  const filterItems = useMemo(
    () => externalFilterItems || extractFilterItems(columns),
    [externalFilterItems, columns]
  );

  // FilterFormBase 已在 destroyOnHidden 重挂载时的 useEffect 里自动把 filterValues
  // setFieldsValue 到 Form；抽屉关闭时只需 reset 清干净
  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) form.resetFields();
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const converted = formValuesToFilter(values, filterItems);
      onSubmit?.(converted);
      onClose?.();
    });
  };

  const handleReset = () => {
    form.resetFields();
    onReset?.();
    onClose?.();
  };

  return (
    <Drawer
      title={title}
      placement="right"
      size={size}
      open={open}
      onClose={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      extra={
        <Space>
          <Button onClick={handleReset}>重置</Button>
          <Button type="primary" onClick={handleSubmit}>查询</Button>
        </Space>
      }
    >
      {/* 共用的 FilterFormBase —— 纵向布局、无容器背景、无按钮栏 */}
      <FilterFormBase
        columns={columns}
        filterItems={externalFilterItems}
        filterValues={filterValues}
        onSubmit={onSubmit}
        onReset={onReset}
        form={form}
        layout="vertical"
        cols={1}
        collapsible={false}
        showButtons={false}
        showContainer={false}
      />
    </Drawer>
  );
};

export default FilterDrawer;
