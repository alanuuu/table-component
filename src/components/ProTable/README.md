# ProTable —— 高级表格组件文档

> 基于 antd Table 的增强组件，提供列头过滤、全局查询抽屉、列显隐排序、远程/本地双模式分页等开箱即用能力。

***

## 目录

- [快速上手](#快速上手)

- [架构设计](#架构设计)

- [Props 完整参考](#props-完整参考)

- [columns 配置详解](#columns-配置详解)

- [过滤类型配置](#过滤类型配置)

- [使用场景示例](#使用场景示例)

- [远程模式对接](#远程模式对接)

- [与旧组件 AdvancedTable 对比](#与旧组件-advancedtable-对比)

- [FAQ](#faq)

***

## 快速上手

### 1. 基础用法（本地模式）

```jsx
import ProTable from './components/ProTable';

const columns = [
  {
    title: '姓名',
    dataIndex: 'name',
    key: 'name',
    sortable: true,
    filter: { type: 'input', placeholder: '搜索姓名' },
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    filter: {
      type: 'select',
      options: [
        { label: '启用', value: 'active' },
        { label: '禁用', value: 'inactive' },
      ],
    },
  },
  {
    title: '创建日期',
    dataIndex: 'createTime',
    key: 'createTime',
    sortable: true,
    filter: { type: 'dateRange' },
  },
];

function MyPage() {
  return (
    <div style={{ height: '100%' }}>
      <ProTable
        columns={columns}
        dataSource={[/* 你的数据数组 */]}
        rowKey="id"
        toolbarLeft={
          <Button type="primary" onClick={handleAdd}>新增</Button>
        }
        onChange={(params) => {
          console.log('分页/过滤/排序变更:', params);
        }}
      />
    </div>
  );
}
```

### 2. 远程模式（从后端拉数据）

```jsx
const [data, setData] = useState([]);
const [loading, setLoading] = useState(false);
const [total, setTotal] = useState(0);

const fetchData = async (params) => {
  setLoading(true);
  const res = await api.queryList({
    page: params.pagination.current,
    pageSize: params.pagination.pageSize,
    ...params.filters,
    sortField: params.sorter.field,
    sortOrder: params.sorter.order,
  });
  setData(res.list);
  setTotal(res.total);
  setLoading(false);
};

<ProTable
  columns={columns}
  dataSource={data}
  total={total}
  loading={loading}
  manualFilter
  manualSort
  manualPagination
  onChange={fetchData}
/>
```

### 3. 启用行选择

```jsx
const [selectedRowKeys, setSelectedRowKeys] = useState([]);

<ProTable
  columns={columns}
  dataSource={data}
  rowSelection={{
    selectedRowKeys,
    onChange: setSelectedRowKeys,
  }}
/>
```

***

## 架构设计

```
src/components/ProTable/
├── index.jsx           # 主组件入口（对外导出）
├── useProTable.js      # 核心逻辑 Hook：过滤/排序/分页状态管理
├── Toolbar.jsx         # 工具栏（左 slot + 过滤/刷新/列设置图标）
├── ColumnFilter.jsx    # 列头下拉过滤面板（multiSelect/treeSelect/dateRange/input）
├── ColumnSettings.jsx  # 列设置 Popover（@dnd-kit 拖拽排序 + 勾选显隐）
├── FilterDrawer.jsx    # 全局查询抽屉（antd Drawer + Form）
├── utils.js            # 工具函数
└── constants.js        # 常量定义
```

**设计原则：**

1. **组合式架构**：核心业务逻辑抽离到 `useProTable` Hook，UI 组件只负责展示
2. **最大复用 antd**：Table / Drawer / Popover / Select / TreeSelect / RangePicker 直接复用
3. **声明式配置**：列上挂 `filter` / `sortable` 即完成功能，无需额外配置表
4. **双模式支持**：本地模式（自动过滤排序分页）和远程模式（统一 onChange 通知）

***

## Props 完整参考

### 数据相关

| Prop         | 类型             | 默认值     | 说明                                       |
| ------------ | -------------- | ------- | ---------------------------------------- |
| `columns`    | `ColumnType[]` | —       | **必填** 列配置，扩展支持 `filter` 和 `sortable` 字段 |
| `dataSource` | `Array`        | `[]`    | 数据源                                      |
| `total`      | `number`       | —       | 远程模式下的数据总数                               |
| `loading`    | `boolean`      | `false` | 加载状态                                     |
| `rowKey`     | `string`       | `'key'` | 行唯一标识字段                                  |

### 过滤

| Prop                  | 类型                 | 默认值     | 说明                                |
| --------------------- | ------------------ | ------- | --------------------------------- |
| `filterValues`        | `Object`           | —       | 受控：当前过滤值 `{ [dataIndex]: value }` |
| `defaultFilterValues` | `Object`           | `{}`    | 非受控：初始过滤值                         |
| `onFilterChange`      | `(values) => void` | —       | 过滤值变化回调                           |
| `manualFilter`        | `boolean`          | `false` | `true`=跳过本地自动过滤（远程模式用）            |

### 排序

| Prop                | 类型                 | 默认值                            | 说明              |
| ------------------- | ------------------ | ------------------------------ | --------------- |
| `sortValues`        | `{ field, order }` | —                              | 受控：当前排序值        |
| `defaultSortValues` | `{ field, order }` | `{ field: null, order: null }` | 非受控：初始排序        |
| `onSortChange`      | `(values) => void` | —                              | 排序变化回调          |
| `manualSort`        | `boolean`          | `false`                        | `true`=跳过本地自动排序 |

### 分页

| Prop               | 类型                | 默认值                                                                                                              | 说明                |
| ------------------ | ----------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------- |
| `pagination`       | `Object \| false` | `{ current:1, pageSize:10, showSizeChanger:true, showQuickJumper:true, pageSizeOptions:['10','20','50','100'] }` | 分页配置，传 `false` 关闭 |
| `manualPagination` | `boolean`         | `false`                                                                                                          | `true`=分页由外部驱动    |

### 统一远程回调

| Prop       | 类型                 | 默认值 | 说明              |
| ---------- | ------------------ | --- | --------------- |
| `onChange` | `(params) => void` | —   | 分页/过滤/排序任一变化时触发 |

**params 结构：**

```js
{
  pagination: { current: 1, pageSize: 10 },
  filters: { status: 'active', keyword: 'xxx' },
  sorter: { field: 'createTime', order: 'descend' },
}
```

### 列显隐 / 排序

| Prop                       | 类型                             | 默认值     | 说明    |
| -------------------------- | ------------------------------ | ------- | ----- |
| `defaultVisibleColumnKeys` | `string[]`                     | 全部列 key | 默认可见列 |
| `defaultColumnOrder`       | `string[]`                     | 原始顺序    | 默认列顺序 |
| `onColumnChange`           | `(order, visibleKeys) => void` | —       | 列变更回调 |

### 工具栏

| Prop                 | 类型           | 默认值    | 说明                  |
| -------------------- | ------------ | ------ | ------------------- |
| `toolbarLeft`        | `ReactNode`  | —      | 左侧 slot（通常放业务按钮）    |
| `toolbarRight`       | `ReactNode`  | —      | 右侧 slot（在图标区前置）     |
| `showFilter`         | `boolean`    | `true` | 显示过滤抽屉图标            |
| `showRefresh`        | `boolean`    | `true` | 显示刷新图标              |
| `showColumnSettings` | `boolean`    | `true` | 显示列设置图标             |
| `onRefresh`          | `() => void` | —      | 刷新回调（不传则模拟 loading） |

### 表格透传

| Prop             | 类型              | 默认值  | 说明                     |
| ---------------- | --------------- | ---- | ---------------------- |
| `tableProps`     | `Object`        | `{}` | 透传给 antd Table 的 props |
| `containerStyle` | `CSSProperties` | —    | 外层容器样式覆盖               |

**tableProps 常用透传：**

```jsx
tableProps={{
  rowSelection: { selectedRowKeys, onChange }, // 行选择
  expandable: { expandedRowRender },            // 展开行
  rowClassName: (record) => record.highlight && 'highlight-row',
  size: 'small',
  bordered: true,
  pagination: false, // 注意：传了会被组件内部覆盖，如需关闭用 pagination={false}
}}
```

***

## columns 配置详解

ProTable 的 `columns` 基于 antd 的 `ColumnType`，扩展了两个字段：

### sortable — 排序配置

```js
{
  title: '金额',
  dataIndex: 'amount',
  key: 'amount',
  sortable: true,  // 启用默认排序（数字/字符串智能比较）
}

// 或自定义比较器
{
  title: '状态',
  dataIndex: 'status',
  key: 'status',
  sortable: (a, b) => statusWeight(a.status) - statusWeight(b.status),
}
```

### filter — 过滤配置

```js
{
  title: '类型',
  dataIndex: 'type',
  key: 'type',
  filter: {
    type: 'select',           // 过滤类型（见下表）
    options: [                // select/multiSelect 静态选项
      { label: '类型A', value: 'A' },
      { label: '类型B', value: 'B' },
    ],
    placeholder: '请选择类型', // 占位提示
  },
}
```

***

## 过滤类型配置

### type: 'select' — 单选下拉（列头原生复选框）

```js
filter: {
  type: 'select',
  options: [
    { label: '对公年报表', value: '对公年报表' },
    { label: '对公月报', value: '对公月报' },
  ],
  placeholder: '请选择',
}
```

### type: 'multiSelect' — 多选平铺（支持静态/远程）

```js
// 静态 options
filter: {
  type: 'multiSelect',
  options: [
    { label: '产品数据', value: '产品数据' },
    { label: '客户数据', value: '客户数据' },
  ],
  placeholder: '请选择',
}

// 远程加载（异步 + 搜索防抖）
filter: {
  type: 'multiSelect',
  loadOptions: async (keyword) => {
    const res = await api.getOptions({ keyword });
    return res.data; // [{ label, value }]
  },
  placeholder: '输入搜索...',
}
```

### type: 'asyncSelect' — 同 multiSelect 别名

```js
filter: {
  type: 'asyncSelect',
  loadOptions: async (keyword) => { /* ... */ },
}
```

### type: 'treeSelect' — 树形多选

```js
filter: {
  type: 'treeSelect',
  treeData: [
    {
      title: '总部',
      value: '总部',
      children: [
        { title: '交易部', value: '交易部' },
        { title: '零售部', value: '零售部' },
      ],
    },
  ],
  treeDefaultExpandAll: true,     // 默认展开全部
  // 可选：懒加载
  loadTreeData: async (node) => {
    const res = await api.getChildren(node.value);
    return res.data;
  },
  placeholder: '选择部门',
}
```

### type: 'dateRange' — 日期范围

```js
filter: {
  type: 'dateRange',
  placeholder: '请选择日期范围',
}
// 过滤值格式：{ start: '2026-01-01', end: '2026-12-31' }
```

### type: 'input' — 模糊搜索

```js
filter: {
  type: 'input',
  placeholder: '输入关键词搜索',
}
// 本地自动做 toLowerCase() 包含匹配
```

### type: 'inputNumber' — 数字输入（仅抽屉内可用）

```js
filter: {
  type: 'inputNumber',
  placeholder: '请输入金额',
}
```

### type: 'switch' — 开关（仅抽屉内可用）

```js
filter: {
  type: 'switch',
}
```

***

## 使用场景示例

### 场景 1：本地数据 + 工具栏操作 + 行选择

```jsx
function UserListPage() {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [data, setData] = useState(mockUsers);

  const columns = [
    { title: '姓名', dataIndex: 'name', key: 'name', sortable: true,
      filter: { type: 'input' } },
    { title: '部门', dataIndex: 'dept', key: 'dept',
      filter: { type: 'multiSelect', options: deptOptions } },
    { title: '入职日期', dataIndex: 'hireDate', key: 'hireDate', sortable: true,
      filter: { type: 'dateRange' } },
  ];

  return (
    <ProTable
      columns={columns}
      dataSource={data}
      rowKey="id"
      tableProps={{ rowSelection: { selectedRowKeys, onChange: setSelectedRowKeys } }}
      toolbarLeft={
        <>
          <Button type="primary" icon={<PlusOutlined />}>新增员工</Button>
          <Button danger disabled={selectedRowKeys.length === 0}
            onClick={() => { /* 批量删除 */ }}>批量删除</Button>
        </>
      }
      pagination={{ pageSize: 20 }}
    />
  );
}
```

### 场景 2：远程数据 + 统一查询

```jsx
function OrderListPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const loadData = async (params) => {
    setLoading(true);
    const { pagination, filters, sorter } = params;
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: pagination.current,
          pageSize: pagination.pageSize,
          filters,
          sortField: sorter.field,
          sortOrder: sorter.order,
        }),
      });
      const json = await res.json();
      setData(json.list);
      setTotal(json.total);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: '订单号', dataIndex: 'orderNo', key: 'orderNo',
      filter: { type: 'input', placeholder: '搜索订单号' } },
    { title: '金额', dataIndex: 'amount', key: 'amount', sortable: true },
    { title: '状态', dataIndex: 'status', key: 'status',
      filter: { type: 'select', options: statusOptions } },
    { title: '下单时间', dataIndex: 'createTime', key: 'createTime', sortable: true,
      filter: { type: 'dateRange' } },
  ];

  return (
    <ProTable
      columns={columns}
      dataSource={data}
      total={total}
      loading={loading}
      manualFilter
      manualSort
      manualPagination
      onChange={loadData}
      pagination={{ pageSize: 20, showSizeChanger: true }}
      toolbarLeft={<Button type="primary" onClick={/* 新建订单 */}>新建订单</Button>}
      onRefresh={() => loadData({ pagination: { current: 1, pageSize: 20 }, filters: {}, sorter: {} })}
    />
  );
}
```

### 场景 3：自定义列渲染 + 操作列

```jsx
const columns = [
  { title: '姓名', dataIndex: 'name', key: 'name' },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    render: (status) => (
      <Tag color={status === 'active' ? 'green' : 'red'}>
        {status === 'active' ? '启用' : '禁用'}
      </Tag>
    ),
    filter: { type: 'select', options: [
      { label: '启用', value: 'active' },
      { label: '禁用', value: 'inactive' },
    ]},
  },
  {
    title: '操作',
    key: 'action',
    fixed: 'right',
    width: 180,
    render: (_, record) => (
      <Space>
        <Button type="link" size="small" onClick={() => edit(record)}>编辑</Button>
        <Button type="link" size="small" danger onClick={() => remove(record)}>删除</Button>
      </Space>
    ),
  },
];
```

### 场景 4：受控模式（自己管理过滤/排序状态）

```jsx
function ControlledTable() {
  const [filterValues, setFilterValues] = useState({});
  const [sortValues, setSortValues] = useState({ field: 'createTime', order: 'descend' });

  return (
    <ProTable
      columns={columns}
      dataSource={data}
      filterValues={filterValues}
      onFilterChange={setFilterValues}
      sortValues={sortValues}
      onSortChange={setSortValues}
      onChange={(p) => console.log('remote:', p)}
    />
  );
}
```

### 场景 5：隐藏不需要的功能

```jsx
<ProTable
  columns={columns}
  dataSource={data}
  showFilter={false}        // 隐藏过滤抽屉图标
  showRefresh={false}       // 隐藏刷新图标
  showColumnSettings={false} // 隐藏列设置
  pagination={false}         // 关闭分页
/>
```

***

## 远程模式对接

### 什么时候用 manualXxx 模式？

| 模式  | manualFilter | manualSort | manualPagination | 说明          |
| --- | :----------: | :--------: | :--------------: | ----------- |
| 纯本地 |     false    |    false   |       false      | 全部前端处理      |
| 半远程 |     false    |    false   |     **true**     | 分页后端，过滤排序前端 |
| 半远程 |   **true**   |  **true**  |       false      | 过滤排序后端，分页前端 |
| 全远程 |   **true**   |  **true**  |     **true**     | 全部后端处理（最常见） |

### onChange 触发时机

| 用户操作      | filters | sorter | pagination    |
| --------- | ------- | ------ | ------------- |
| 修改列头过滤    | ✅ 更新    | —      | current 重置为 1 |
| 全局抽屉查询/重置 | ✅ 更新    | —      | current 重置为 1 |
| 点击列排序图标   | —       | ✅ 更新   | —             |
| 切换分页      | —       | —      | ✅ 更新          |

### onRefresh 建议

```jsx
// 远程模式：刷新 = 重新请求第一页
const handleRefresh = () => {
  loadData({
    pagination: { current: 1, pageSize: 20 },
    filters: {}, // 保留当前过滤？还是清空？
    sorter: {},
  });
};
```

***

## FAQ

### Q1: 列 filter 配置后没显示过滤图标？

检查以下几点：

1. 列配置的 `key` 字段是否唯一且存在
2. 过滤类型是否拼写正确（`multiSelect` 而非 `multiselect`）
3. ProTable 是否被正确引入（而非旧的 AdvancedTable）

### Q2: 远程模式下 onChange 被触发多次？

这是正常的。当过滤值变更时，组件会同时触发：

- 重置分页到第 1 页

- 通知 onChange

如果需要防抖，可以在 `onChange` 内部自己 debounce。

### Q3: 如何自定义 antd Table 的滚动区域高度？

组件内部会自动监听容器高度变化并计算 `scroll.y`。
确保 ProTable 的外层容器有明确的高度约束（如 `flex:1 + minHeight:0` 或固定 `height`）。

### Q4: 列设置后如何持久化？

```jsx
const STORAGE_KEY = 'my-table-columns';

// 初始化时从 localStorage 恢复
const [localStorageLoaded, setLocalStorageLoaded] = useState(false);
useEffect(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const { order, visible } = JSON.parse(saved);
    // 你需要把这两个传给 ProTable 的 defaultColumnOrder / defaultVisibleColumnKeys
  }
  setLocalStorageLoaded(true);
}, []);

const handleColumnChange = (order, visibleKeys) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ order, visible: visibleKeys }));
  onColumnChange?.(order, visibleKeys);
};
```

### Q5: 如何在本地模式下禁用某列的自动过滤？

不需要设置 `manualFilter=true`（那会禁用全部过滤）。
而是在列上配置自定义 `onFilter` 逻辑即可覆盖默认行为：

```jsx
{
  title: '金额',
  dataIndex: 'amount',
  key: 'amount',
  filter: { type: 'input' },
  onFilter: (value, record) => record.amount >= Number(value),
}
```

### Q6: filterValues 受控模式下不更新？

受控模式需要你自己在 `onFilterChange` 中更新 state：

```jsx
const [filterValues, setFilterValues] = useState({});
<ProTable
  filterValues={filterValues}
  onFilterChange={setFilterValues}  // ← 必须有
/>
```

### Q7: treeSelect 的 loadTreeData 如何知道是哪级节点加载？

`loadTreeData` 接收 antd Tree 的 `node` 对象，你可以用 `node.value` 来查询子节点：

```js
loadTreeData: async (node) => {
  // node.value 是当前被展开的节点值
  const children = await api.getChildren(node.value);
  return children.map(c => ({ title: c.name, value: c.id }));
}
```

***

## API 速查表

| 能力     | 本地模式 | 远程模式 | 配置方式                          |
| ------ | :--: | :--: | ----------------------------- |
| 列头过滤   |   ✅  |   ✅  | `columns[].filter`            |
| 全局过滤抽屉 |   ✅  |   ✅  | 工具栏过滤图标自动弹出                   |
| 列排序    |   ✅  |   ✅  | `columns[].sortable`          |
| 自动分页   |   ✅  |   —  | 默认开启                          |
| 远程分页   |   —  |   ✅  | `manualPagination + onChange` |
| 列显隐/排序 |   ✅  |   ✅  | 工具栏列设置图标                      |
| 行选择    |   ✅  |   ✅  | `tableProps.rowSelection`     |
| 自定义渲染  |   ✅  |   ✅  | `columns[].render`            |

***

*文档版本：v1.0 · 更新日期：2026-09-03*

***

## FilterForm —— 查询表单组件（与 ProTable 共用过滤项）

FilterForm 的核心价值：**与 ProTable 共用同一套 columns\[].filter 配置**。

用户只在 columns 上写一次 filter 字段，FilterForm（顶部查询条）和 ProTable（列头过滤、抽屉过滤）三个入口都能消费同一份 schema。

### 最小闭环

\`jsx
import { FilterForm } from './components/ProTable';

const columns = \[
{ title: '状态', dataIndex: 'status', key: 'status',
filter: { type: 'select', options: \[/\* ... \*/] } },
{ title: '名称', dataIndex: 'name', key: 'name',
filter: { type: 'input' } },
];

\<FilterForm columns={columns} onSubmit={(values) => console.log(values)} />
\`

### 与 ProTable 联动（最常见）

\`jsx
function Page() {
const \[filterValues, setFilterValues] = useState({});

return (
<>
{/\* 顶部查询条：共用 columns.filter \*/}
\<FilterForm
columns={columns}
filterValues={filterValues}
onSubmit={setFilterValues}
onReset={() => setFilterValues({})}
/>

```
  {/* 表格：受控接收同一份 filterValues，列头过滤与顶部双向联动 */}
  <ProTable
    columns={columns}
    dataSource={data}
    filterValues={filterValues}
    onFilterChange={setFilterValues}
  />
</>
```

);
}
\`

### 联动原理

`columns[].filter 配置
       │
       ├── extractFilterItems() ──► FilterForm 渲染 Form.Item
       │
       └── extractFilterItems() ──► FilterDrawer 渲染 Form.Item                                     + ProTable 列头注入 filterDropdown`

三者共享：extractFilterItems /
enderFilterFormItem / AsyncMultiSelect / AsyncTreeSelect

### FilterForm Props

| Prop                 | 类型                                     | 默认值          | 说明                         |
| -------------------- | -------------------------------------- | ------------ | -------------------------- |
| columns              | ColumnType\[]                          | —            | 列配置（自动提取 filter）           |
| ilterItems          | FilterItem\[]                          | —            | 直接传过滤项（优先级高于 columns 自动提取） |
| ilterValues         | Object                                 | —            | 受控：当前过滤值                   |
| defaultFilterValues  | Object                                 | {}           | 非受控：初始值                    |
| onValuesChange       | (changed, all) => void                 | —            | 实时字段变化回调                   |
| onSubmit             | (values) => void                       | —            | 点击查询按钮                     |
| onReset              | () => void                             | —            | 点击重置按钮                     |
| layout               | 'horizontal' \| 'vertical' \| 'inline' | 'horizontal' | 表单布局                       |
| cols                 | <br />                                 | <br />       | <br />                     |
| umber                | 响应式（xs:1 sm:2 md:3 +）                  | 栅格列数         | <br />                     |
| collapsible          | oolean                                | rue          | 是否支持折叠收起                   |
| defaultCollapsedRows | <br />                                 | <br />       | <br />                     |
| umber                | 1                                      | 折叠时显示行数      | <br />                     |
| loading              | oolean                                | alse        | 查询按钮 loading               |
| submitText           | string                                 | '查询'         | 查询按钮文案                     |
| <br />               | <br />                                 | <br />       | <br />                     |
| esetText             | string                                 | '重置'         | 重置按钮文案                     |
| leftSlot /           | <br />                                 | <br />       | <br />                     |
| ightSlot             | ReactNode                              | —            | 按钮区前/后 slot                |
| ormProps            | Object                                 | {}           | 透传给 antd Form              |
| style                | CSSProperties                          | —            | 外层样式                       |

### 三种用法对比

\`jsx
// 用法 1：自动从 columns 提取 filterItems（最推荐） <FilterForm columns={columns} onSubmit={handleSubmit} />

// 用法 2：直接传 filterItems（与 columns 解耦）
\<FilterForm
filterItems={\[
{ name: 'keyword', label: '关键字', type: 'input', placeholder: '搜索...' },
{ name: 'status',  label: '状态',   type: 'select',
options: \[{ label: '启用', value: 'A' }, { label: '禁用', value: 'B' }] },
]}
onSubmit={handleSubmit}
/>

// 用法 3：cols + collapsible 自定义布局
\<FilterForm
columns={columns}
cols={4}
collapsible
defaultCollapsedRows={1}
submitText="搜索"
leftSlot={<Button>高级查询</Button>}
/>
\`

### react-best-practices 应用

| 规则                                         | 应用位置                                                             |
| ------------------------------------------ | ---------------------------------------------------------------- |
| <br />                                     | <br />                                                           |
| erender-no-inline-components               | AsyncMultiSelect / AsyncTreeSelect /                             |
| enderFilterFormItem 均为模块级组件                | <br />                                                           |
| <br />                                     | <br />                                                           |
| erender-memo                               | ilterItems /                                                    |
| esolvedCols / initialValues 用 useMemo 稳定引用 | <br />                                                           |
| <br />                                     | <br />                                                           |
| erender-lazy-state-init                    | useState(() => staticTreeData \|\| \[]) 避免 props 引用变动触发不必要渲染     |
| <br />                                     | <br />                                                           |
| erender-functional-setstate                | setCollapsed(prev => !prev) 函数式更新避免闭包陈旧                          |
| js-cache-function-results                  | optionsCache 模块级 Map，跨 FilterForm + FilterDrawer 共享远程 options 缓存 |

### 统一导出

`jsx
// ProTable 全部从同一个模块导出
import ProTable, { FilterForm, FilterDrawer, useProTable } from './components/ProTable';
import { extractFilterItems, formValuesToFilter, filterValuesToForm } from './components/ProTable';
import { renderFilterFormItem, AsyncMultiSelect, AsyncTreeSelect } from './components/ProTable';
`

### 目录结构

`src/components/ProTable/
├── index.js              # 统一导出（新增）
├── index.jsx             # ProTable 主组件
├── FilterForm.jsx        # 新增：查询表单组件
├── FilterDrawer.jsx      # 全局查询抽屉（重构：复用 formRenderers）
├── Toolbar.jsx
├── ColumnFilter.jsx
├── ColumnSettings.jsx
├── useProTable.js
├── formRenderers.jsx     # 新增：AsyncMultiSelect/AsyncTreeSelect/renderFilterFormItem 模块共享
├── utils.js
├── constants.js
└── README.md`

*文档版本：v1.1 · 更新日期：2026-09-03*
