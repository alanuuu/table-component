import { Button, Space } from 'antd';
import { FilterOutlined, SyncOutlined } from '@ant-design/icons';
import ColumnSettings from './ColumnSettings';

/**
 * 工具栏组件 —— 标准组件，支持 slot 注入
 *
 * Props:
 * @param {array} columns - 列配置数组
 * @param {array} visibleColumnKeys - 当前可见的列 key 数组
 * @param {function} onColumnChange - 列变化回调 (newOrder, newVisibleKeys) => void
 * @param {function} onFilterClick - 点击过滤图标
 * @param {function} onRefresh - 点击刷新图标
 * @param {React.ReactNode} leftSlot - 左侧动作区域（slot）
 * @param {React.ReactNode} rightSlot - 右侧图标区域前置 slot
 * @param {object} style - 工具栏容器样式覆盖
 */
const Toolbar = ({
  columns,
  visibleColumnKeys,
  onColumnChange,
  onFilterClick,
  onRefresh,
  leftSlot,
  rightSlot,
  style,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        ...style,
      }}
    >
      {/* 左侧 */}
      <Space wrap size={8}>
        {leftSlot}
      </Space>

      {/* 右侧 */}
      <Space size={16}>
        {rightSlot}
        {onFilterClick && (
          <FilterOutlined
            onClick={onFilterClick}
            style={{ cursor: 'pointer', fontSize: 16, color: '#595959' }}
            title="过滤"
          />
        )}
        {onRefresh && (
          <SyncOutlined
            onClick={onRefresh}
            style={{ cursor: 'pointer', fontSize: 16, color: '#595959' }}
            title="刷新"
          />
        )}
        <ColumnSettings
          columns={columns}
          visibleColumnKeys={visibleColumnKeys}
          onChange={onColumnChange}
        />
      </Space>
    </div>
  );
};

export default Toolbar;
