import { useState } from 'react';
import { Checkbox, Button, Space } from 'antd';
import { SettingOutlined, HolderOutlined } from '@ant-design/icons';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DndContext, closestCenter } from '@dnd-kit/core';

/**
 * 可排序的列项
 */
const SortableItem = ({ id, title, visible, onToggle }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        padding: '6px 8px',
        borderRadius: 4,
        cursor: 'default',
        gap: 8,
      }}
    >
      <span
        {...attributes}
        {...listeners}
        style={{
          cursor: 'grab',
          color: '#bfbfbf',
          fontSize: 14,
          padding: 2,
        }}
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
 * 列设置下拉 - 点击工具栏设置图标弹出
 * 支持列的拖动排序和列的显示隐藏
 */
const ColumnSettings = ({ columns, visibleColumnKeys, onChange }) => {
  const [open, setOpen] = useState(false);
  const [localOrder, setLocalOrder] = useState(columns.map((c) => c.key));
  const [localVisible, setLocalVisible] = useState(visibleColumnKeys);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = localOrder.indexOf(active.id);
      const newIndex = localOrder.indexOf(over.id);
      const newOrder = arrayMove(localOrder, oldIndex, newIndex);
      setLocalOrder(newOrder);
    }
  };

  const handleToggle = (key, checked) => {
    setLocalVisible((prev) => {
      if (checked) {
        return [...prev, key];
      }
      return prev.filter((k) => k !== key);
    });
  };

  const handleConfirm = () => {
    onChange(localOrder, localVisible);
    setOpen(false);
  };

  const handleReset = () => {
    setLocalOrder(columns.map((c) => c.key));
    setLocalVisible(columns.map((c) => c.key));
  };

  const syncState = (isOpen) => {
    if (isOpen) {
      setLocalOrder(columns.map((c) => c.key));
      setLocalVisible(visibleColumnKeys);
    }
    setOpen(isOpen);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <SettingOutlined
        onClick={() => syncState(!open)}
        style={{
          cursor: 'pointer',
          fontSize: 16,
          color: '#595959',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#1677ff')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#595959')}
      />
      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 1040 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 8,
              background: '#fff',
              borderRadius: 6,
              boxShadow: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12)',
              padding: 12,
              zIndex: 1050,
              minWidth: 240,
              maxHeight: 400,
              overflowY: 'auto',
            }}
          >
            <div style={{ marginBottom: 8, color: '#595959', fontSize: 13 }}>
              拖动排序 / 勾选显隐
            </div>
            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
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
        </>
      )}
    </div>
  );
};

export default ColumnSettings;
