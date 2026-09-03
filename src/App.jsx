import React, { useState, useMemo } from 'react';
import { Button, Space, Tag, Tabs } from 'antd';
import {
  PlusOutlined, AuditOutlined, UndoOutlined,
  BugOutlined, SyncOutlined, ImportOutlined, ExportOutlined,
} from '@ant-design/icons';

// 新组件（统一从 index.js 导出）
import ProTable, { FilterForm } from './components/ProTable';


import {
  mockData,
  remoteAssetCodeOptions,
  remoteProductCodeOptions,
  remoteProductNameOptions,
  remoteTreeData,
} from './data/mockData';


// ===================== 列配置（3 个 Tab 共用）=====================
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
      loadOptions: async (keyword) => {
        await new Promise((r) => setTimeout(r, 400));
        const list = remoteAssetCodeOptions;
        if (!keyword) return list;
        const kw = keyword.toLowerCase();
        return list.filter((o) => o.label.toLowerCase().includes(kw));
      },
      placeholder: '资产代码',
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
      placeholder: '产品代码',
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
      placeholder: '产品名称',
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

// ===================== 工具栏 slot =====================
const toolbarLeftSlot = (
  <>
    <Button type="primary" icon={<PlusOutlined />}>新增</Button>
    <Button icon={<AuditOutlined />}>审核</Button>
    <Button icon={<UndoOutlined />}>反审核</Button>
    <Button icon={<BugOutlined />}>调试</Button>
    <Button icon={<SyncOutlined />}>更新至当期</Button>
    <Button icon={<ImportOutlined />}>导入</Button>
    <Button icon={<ExportOutlined />}>导出</Button>
  </>
);

// ===================== 示例 App =====================
function App() {
  const [filterValues, setFilterValues] = useState({});
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const rowSelection = useMemo(() => ({
    selectedRowKeys,
    onChange: setSelectedRowKeys,
  }), [selectedRowKeys]);

  return (
    <div style={{
      padding: 24,
      background: '#f5f5f5',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>
      <FilterForm
        columns={columns}
        filterValues={filterValues}
        onSubmit={setFilterValues}
        onReset={() => setFilterValues({})}
        collapsible
        defaultCollapsedRows={1}
        cols={3}
      />
      <ProTable
        columns={columns}
        dataSource={mockData}
        loading={false}
        rowKey="key"
        tableProps={{ rowSelection }}
        toolbarLeft={toolbarLeftSlot}
        containerStyle={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
        onChange={(p) => console.log('[ProTable] onChange', p)}
        pagination={{ pageSize: 200 }}
      />

    </div>
  );
}

export default App;
