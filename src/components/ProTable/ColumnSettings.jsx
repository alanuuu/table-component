import { useState } from 'react';
import { Popover, Checkbox, Button, Space } from 'antd';
import { SettingOutlined, HolderOutlined } from '@ant-design/icons';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * 可拖动排序列项
 */
const SortableItem = ({ id, title, visible, onToggle }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        display: 'flex',
        alignItems: 'center',
        padding: '6px 8px',
        borderRadius: 4,
        gap: 8,
      }}
    >
      <span
        {...attributes}
        {...listeners}
        style={{ cursor: 'grab', color: '#bfbfbf', fontSize: 14, padding: 2 }}
      >
        <HolderOutlined />
      </span>
      <Checkbox checked={visible} onChange={(e) => onToggle(e.target.checked)}>
        {title}
      </Checkbox>
    </div>
  );
};

/**
 * 列设置组件 —— 基于 antd Popover + @dnd-kit
 *
 * 功能：
 * - 列勾选显隐
 * - 拖拽排序
 * - 重置 / 确定
 *
 * Props:
 * @param {Array} columns - 列配置
 * @param {Array} visibleColumnKeys - 当前可见列 key
 * @param {Function} onChange - 变更回调 (newOrder, newVisibleKeys) => void
 */
const ColumnSettings = ({ columns, visibleColumnKeys, onChange }) => {
  const [open, setOpen] = useState(false);
  const [localOrder, setLocalOrder] = useState(columns.map((c) => c.key));
  const [localVisible, setLocalVisible] = useState(visibleColumnKeys);

  const handleOpenChange = (isOpen) => {
    if (isOpen) {
      setLocalOrder(columns.map((c) => c.key));
      setLocalVisible(visibleColumnKeys);
    }
    setOpen(isOpen);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = localOrder.indexOf(active.id);
      const newIndex = localOrder.indexOf(over.id);
      setLocalOrder(arrayMove(localOrder, oldIndex, newIndex));
    }
  };

  const handleToggle = (key, checked) => {
    setLocalVisible((prev) => (checked ? [...prev, key] : prev.filter((k) => k !== key)));
  };

  const handleConfirm = () => {
    onChange?.(localOrder, localVisible);
    setOpen(false);
  };

  const handleReset = () => {
    setLocalOrder(columns.map((c) => c.key));
    setLocalVisible(columns.map((c) => c.key));
  };

  const content = (
    <div style={{ minWidth: 260, maxHeight: 400, overflowY: 'auto' }}>
      <div style={{ marginBottom: 8, color: '#595959', fontSize: 13 }}>
        拖动排序 / 勾选显隐
      </div>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={localOrder} strategy={verticalListSortingStrategy}>
          {localOrder.map((key) => {
            const col = columns.find((c) => c.key === key);
            if (!col) return null;
            return (
              <SortableItem
                key={key}
                id={key}
                title={col.title}
                visible={localVisible.includes(key)}
                onToggle={(checked) => handleToggle(key, checked)}
              />
            );
          })}
        </SortableContext>
      </DndContext>
      <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 8, paddingTop: 8, textAlign: 'right' }}>
        <Space size={8}>
          <Button size="small" onClick={handleReset}>重置</Button>
          <Button size="small" type="primary" onClick={handleConfirm}>确定</Button>
        </Space>
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={handleOpenChange}
      placement="bottomRight"
      arrow={false}
    >
      <SettingOutlined
        style={{ cursor: 'pointer', fontSize: 16, color: '#595959' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#1677ff')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#595959')}
      />
    </Popover>
  );
};

export default ColumnSettings;
