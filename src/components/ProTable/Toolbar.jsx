import { Space, Tooltip } from 'antd';
import { SearchOutlined, SyncOutlined } from '@ant-design/icons';
import ColumnSettings from './ColumnSettings';

/**
 * ProTable 工具栏组件
 *
 * 职责：
 * - 左侧插槽（通常放业务操作按钮）
 * - 右侧图标区：过滤 / 刷新 / 列设置
 *
 * Props:
 * @param {Array} columns - 列配置
 * @param {Array} visibleColumnKeys - 当前可见列 key
 * @param {Function} onColumnChange - 列变更回调
 * @param {Function} onFilterClick - 过滤图标点击
 * @param {Function} onRefresh - 刷新回调
 * @param {boolean} showFilter - 显示过滤按钮
 * @param {boolean} showRefresh - 显示刷新按钮
 * @param {boolean} showColumnSettings - 显示列设置
 * @param {React.ReactNode} leftSlot - 左侧插槽
 * @param {React.ReactNode} rightSlot - 右侧前置插槽
 * @param {Object} style - 工具栏样式覆盖
 */
const Toolbar = ({
  columns,
  visibleColumnKeys,
  onColumnChange,
  onFilterClick,
  onRefresh,
  showFilter = true,
  showRefresh = true,
  showColumnSettings = true,
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
      <Space wrap size={8}>{leftSlot}</Space>

      <Space size={16}>
        {rightSlot}
        {showFilter && (
          <Tooltip title="过滤" mouseEnterDelay={0.5}>
            <SearchOutlined
              onClick={onFilterClick}
              style={{ cursor: 'pointer', fontSize: 16, color: '#595959' }}
            />
          </Tooltip>
        )}
        {showRefresh && (
          <Tooltip title="刷新" mouseEnterDelay={0.5}>
            <SyncOutlined
              onClick={onRefresh}
              style={{ cursor: 'pointer', fontSize: 16, color: '#595959' }}
            />
          </Tooltip>
        )}
        {showColumnSettings && (
          <ColumnSettings
            columns={columns}
            visibleColumnKeys={visibleColumnKeys}
            onChange={onColumnChange}
          />
        )}
      </Space>
    </div>
  );
};

export default Toolbar;

