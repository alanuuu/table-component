import dayjs from 'dayjs';

// 报告类型选项
const reportTypeOptions = [
  { label: '对公年报表', value: '对公年报表' },
  { label: '对公月报', value: '对公月报' },
  { label: '对私年报表', value: '对私年报表' },
  { label: '对私月报', value: '对私月报' },
];

// 数据类型选项
const dataTypeOptions = [
  { label: '产品数据', value: '产品数据' },
  { label: '客户数据', value: '客户数据' },
  { label: '交易数据', value: '交易数据' },
];

// 资产代码（15 个，为远程 options 提供数据源）
const assetCodes = [
  '(06701)公平交易部', '(0209)通宇宝信贷', '(05710)基金金卡白金卡',
  '(03012)零售事业部', '(04008)信用卡中心', '(09001)投行部',
  '(09002)资产管理部', '(01005)风险管理部', '(01008)合规部',
  '(02001)网络金融部', '(02003)运营管理部', '(03001)财富管理中心',
  '(03005)私人银行部', '(04001)国际业务部', '(05001)金融市场部',
];

// 产品代码（20 个）
const productCodes = [
  '000001', '000005', '000006', '000011', '000027',
  '000036', '000045', '000089', '000102', '000128',
  '000156', '000188', '000201', '000258', '000303',
  '000328', '000356', '000418', '000508', '000615',
];

// 产品名称（20 个）
const productNames = [
  '企业通存', '高方万优智灵活版', '鑫享利稳健版', '定利盈1号',
  '灵活添利宝', '月月盈理财', '稳盈90天', '智选60天',
  '安鑫快线', '日日鑫', '随心存', '慧选成长版',
  '稳健优选', '智能定投A', '智能定投C', '多策略混合',
  '全球精选', '沪港通优选', '美股精选', '债券优选',
];

// 日期范围
const startDate = dayjs('2026-06-01');
const endDate = dayjs('2026-07-15');

// 生成 mock 数据（目标 200 条）
const generateMockData = (count = 200) => {
  const reportTypes = reportTypeOptions.map((o) => o.value);
  const dataTypes = dataTypeOptions.map((o) => o.value);

  const data = [];
  for (let i = 0; i < count; i++) {
    const assetCode = assetCodes[i % assetCodes.length];
    const productCode = productCodes[Math.floor(Math.random() * productCodes.length)];
    const productName = productNames[Math.floor(Math.random() * productNames.length)];
    const daysDiff = endDate.diff(startDate, 'day');
    const randomDate = startDate.add(Math.floor(Math.random() * daysDiff), 'day');

    data.push({
      key: `row-${i + 1}`,
      reportType: reportTypes[Math.floor(Math.random() * reportTypes.length)],
      dataType: dataTypes[Math.floor(Math.random() * dataTypes.length)],
      assetCode,
      productCode,
      productName,
      reportEndDate: randomDate.format('YYYY-MM-DD'),
    });
  }
  return data;
};

export const mockData = generateMockData(200);

// ===== 远程 options 数据源（各 200 条，模拟大型下拉数据量）=====

// 构造 200 个动态资产代码（前缀 + 流水号）
export const remoteAssetCodeOptions = (() => {
  const list = [];
  const prefixes = assetCodes;
  for (let i = 0; i < 200; i++) {
    const base = prefixes[i % prefixes.length];
    const num = String(Math.floor(i / prefixes.length) + 1).padStart(3, '0');
    list.push({
      label: `${base}-${num}`,
      value: `${base}-${num}`,
    });
  }
  return list;
})();

// 构造 200 个动态产品名称（产品名 + 编号）
export const remoteProductNameOptions = (() => {
  const list = [];
  for (let i = 0; i < 200; i++) {
    const name = productNames[i % productNames.length];
    const num = String(i + 1).padStart(3, '0');
    list.push({
      label: `${name}-${num}`,
      value: `${name}-${num}`,
    });
  }
  return list;
})();

// 构造 200 个产品代码（流水号递增）
export const remoteProductCodeOptions = (() => {
  const list = [];
  for (let i = 0; i < 200; i++) {
    const num = String(i + 1).padStart(6, '0');
    list.push({ label: num, value: num });
  }
  return list;
})();

// 远程树形数据（两级 × 每级若干项，展开后合计 200+ leaf）
export const remoteTreeData = [
  {
    title: '公司总部',
    value: '总部',
    selectable: false,
    children: [
      {
        title: '交易线',
        value: '总部-交易线',
        selectable: false,
        children: [
          { title: '公平交易部', value: '(06701)公平交易部' },
          { title: '通宇宝信贷', value: '(0209)通宇宝信贷' },
          { title: '金融市场部', value: '(05001)金融市场部' },
        ],
      },
      {
        title: '零售线',
        value: '总部-零售线',
        selectable: false,
        children: [
          { title: '零售事业部', value: '(03012)零售事业部' },
          { title: '信用卡中心', value: '(04008)信用卡中心' },
          { title: '网络金融部', value: '(02001)网络金融部' },
        ],
      },
      {
        title: '中后台',
        value: '总部-中后台',
        selectable: false,
        children: [
          { title: '风险管理部', value: '(01005)风险管理部' },
          { title: '合规部', value: '(01008)合规部' },
          { title: '运营管理部', value: '(02003)运营管理部' },
        ],
      },
    ],
  },
  {
    title: '基金业务线',
    value: '基金',
    selectable: false,
    children: [
      {
        title: '公募基金',
        value: '基金-公募',
        selectable: false,
        children: [
          { title: '基金金卡白金卡', value: '(05710)基金金卡白金卡' },
          { title: '通宇基金管理', value: '(09001)通宇基金管理' },
        ],
      },
      {
        title: '私募 / 资管',
        value: '基金-私募',
        selectable: false,
        children: [
          { title: '资产管理部', value: '(09002)资产管理部' },
          { title: '投行部', value: '(09001)投行部' },
        ],
      },
    ],
  },
  {
    title: '国际业务',
    value: '国际',
    selectable: false,
    children: [
      { title: '国际业务部', value: '(04001)国际业务部' },
      { title: '私人银行部', value: '(03005)私人银行部' },
      { title: '财富管理中心', value: '(03001)财富管理中心' },
    ],
  },
];
