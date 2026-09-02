import { Drawer, Form, Button, Space } from 'antd';
import { renderFormItem, filterValuesToFormValues, formValuesToFilterValues } from './utils/formRenderer';

/**
 * 全局查询抽屉 —— 标准组件
 *
 * Props:
 * @param {boolean} open - 是否打开（受控）
 * @param {function} onClose - 关闭回调
 * @param {array} filterItems - 过滤字段配置数组 [{ name, label, type, options, placeholder }]
 * @param {object} filterValues - 当前过滤值 { [name]: value }
 * @param {function} onSubmit - 提交过滤 (values) => void
 * @param {function} onReset - 重置过滤 () => void
 * @param {string} title - 抽屉标题，默认 '查询条件'
 * @param {number|string} size - 抽屉尺寸（antd v6 size API，支持 number/string/'default'/'large'）
 */
const FilterDrawer = ({
  open,
  onClose,
  filterItems,
  filterValues,
  onSubmit,
  onReset,
  title = '查询条件',
  size = 420,
}) => {
  const [form] = Form.useForm();

  const handleAfterOpenChange = (isOpen) => {
    if (isOpen) {
      form.setFieldsValue(filterValuesToFormValues(filterValues, filterItems));
    } else {
      form.resetFields();
    }
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const converted = formValuesToFilterValues(values, filterItems);
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
      <Form form={form} layout="vertical">
        {filterItems.map((item) => renderFormItem(item))}
      </Form>
    </Drawer>
  );
};

export default FilterDrawer;
