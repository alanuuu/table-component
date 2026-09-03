import React, { useState } from 'react';
import { Button, Space, Tag } from 'antd';
import {
  PlusOutlined, AuditOutlined, UndoOutlined,
  BugOutlined, SyncOutlined, ImportOutlined, ExportOutlined,
} from '@ant-design/icons';
import AdvancedTable from './components/AdvancedTable';
import {
  mockData,
  remoteAssetCodeOptions,
  remoteProductCodeOptions,
  remoteProductNameOptions,
  remoteTreeData,
} from './data/mockData';


const columns = [
  {
    title: '报告类型',
    dataIndex: 'reportType',
    key: 'reportType',
    width: 130,
    sortable: true,
    filter: {
      type: 'select',
      options: [
        { label: '对公年报表', value: '对公年报表' },
        { label: '对公月报', value: '对公月报' },
        { label: '对私年报表', value: '对私年报表' },
        { label: '对私月报', value: '对私月报' },
      ],
      placeholder: '请选择报告类型',
    },
  },
  {
    title: '数据类型',
    dataIndex: 'dataType',
    key: 'dataType',
    width: 110,
    sortable: true,
    filter: {
      type: 'multiSelect',
      options: [
        { label: '产品数据', value: '产品数据' },
        { label: '客户数据', value: '客户数据' },
        { label: '交易数据', value: '交易数据' },
      ],
      placeholder: '请选择数据类型',
    },
  },
  {
    title: '资产代码',
    dataIndex: 'assetCode',
    key: 'assetCode',
    width: 200,
    sortable: true,
    filter: {
      type: 'multiSelect',
      // ✅ 远程加载 200 条 options，模拟接口延迟
      loadOptions: async (keyword) => {
        await new Promise((r) => setTimeout(r, 400));
        const list = remoteAssetCodeOptions;
        if (!keyword) return list;
        const kw = keyword.toLowerCase();
        return list.filter((o) => o.label.toLowerCase().includes(kw));
      },
      placeholder: '远程加载中...（可搜索）',
    },
  },
  {
    title: '产品代码',
    dataIndex: 'productCode',
    key: 'productCode',
    width: 120,
    sortable: true,
    filter: {
      type: 'multiSelect',
      loadOptions: async (keyword) => {
        await new Promise((r) => setTimeout(r, 300));
        const list = remoteProductCodeOptions;
        if (!keyword) return list;
        const kw = keyword.toLowerCase();
        return list.filter((o) => o.label.toLowerCase().includes(kw));
      },
      placeholder: '远程加载中...',
    },
  },
  {
    title: '产品名称',
    dataIndex: 'productName',
    key: 'productName',
    width: 180,
    sortable: true,
    filter: {
      type: 'multiSelect',
      loadOptions: async (keyword) => {
        await new Promise((r) => setTimeout(r, 350));
        const list = remoteProductNameOptions;
        if (!keyword) return list;
        const kw = keyword.toLowerCase();
        return list.filter((o) => o.label.toLowerCase().includes(kw));
      },
      placeholder: '远程加载中...',
    },
  },
  {
    title: '产品归属部门（树形）',
    dataIndex: 'dept',
    key: 'dept',
    width: 200,
    filter: {
      type: 'treeSelect',
      treeData: remoteTreeData,
      treeDefaultExpandAll: true,
      placeholder: '树形多选',
    },
    render: (_, record) => record.assetCode?.replace(/\(\d+\)/, '') || '-',
  },
  {
    title: '报告期末日期',
    dataIndex: 'reportEndDate',
    key: 'reportEndDate',
    width: 160,
    sortable: true,
    filter: {
      type: 'dateRange',
      placeholder: '请选择日期范围',
    },
  },
];

// ===================== 示例 App =====================
function App() {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const handleRemoteChange = (params) => {
    console.log('[AdvancedTable] onChange', params);
  };
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys) => {
      console.log('selectedRowKeys changed: ', newSelectedRowKeys);
      setSelectedRowKeys(newSelectedRowKeys);
    }
  };

  return (
    <div style={{
      padding: 24,
      background: '#f5f5f5',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>
      {/* AdvancedTable 父容器：flex:1 自动填满剩余空间 */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <AdvancedTable
          columns={columns}
          dataSource={mockData}
          loading={false}
          rowKey="key"
          tableProps={{
            rowSelection,
          }}
          toolbarLeft={
            <>
              <Button type="primary" icon={<PlusOutlined />}>新增</Button>
              <Button icon={<AuditOutlined />}>审核</Button>
              <Button icon={<UndoOutlined />}>反审核</Button>
              <Button icon={<BugOutlined />}>调试</Button>
              <Button icon={<SyncOutlined />}>更新至当期</Button>
              <Button icon={<ImportOutlined />}>导入</Button>
              <Button icon={<ExportOutlined />}>导出</Button>
            </>
          }

          containerStyle={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
          onChange={handleRemoteChange}
          pagination={{ pageSize: 200 }}  // 单页 200 条
        />
      </div>
    </div>
  );
}

export default App;
