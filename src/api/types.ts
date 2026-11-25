/*
 * 后台接口（/api/app/**）返回的数据的样子。字段名和 tms-service 的 AppDtos.java 一一对应。
 * 后台只返回代码（状态、异常类型、轨迹动作），显示什么文字由 App 按语言决定（见 src/i18n）。
 */

/** ASSIGNED 待接单，ACCEPTED 已接单，IN_TRANSIT 配送中，SIGNED 已签收，EXCEPTION 异常，CANCELLED 已取消 */
export type TaskStatus = 'ASSIGNED' | 'ACCEPTED' | 'IN_TRANSIT' | 'SIGNED' | 'EXCEPTION' | 'CANCELLED';

/** IDLE 可接单，DELIVERING 配送中（系统维护），PAUSED 暂停接单，OFFLINE 离线 */
export type WorkStatus = 'IDLE' | 'DELIVERING' | 'PAUSED' | 'OFFLINE';

/** 司机可以自己切换到的工作状态 */
export type ManualWorkStatus = 'IDLE' | 'PAUSED' | 'OFFLINE';

export type ExceptionType = 'NO_CONTACT' | 'WRONG_ADDRESS' | 'REJECTED' | 'DAMAGED' | 'VEHICLE' | 'OTHER';

export const EXCEPTION_TYPES: ExceptionType[] = ['NO_CONTACT', 'WRONG_ADDRESS', 'REJECTED', 'DAMAGED', 'VEHICLE', 'OTHER'];

export const MANUAL_WORK_STATUSES: ManualWorkStatus[] = ['IDLE', 'PAUSED', 'OFFLINE'];

export interface Profile {
  id: number;
  driverCode: string;
  driverName: string;
  phone: string;
  username: string;
  /** 所属网点 */
  orgName: string | null;
  /** 主要配送区域 */
  areaName: string | null;
  workStatus: WorkStatus;
  /** 绑定的车辆；没有绑定时为空 */
  plateNo: string | null;
  vehicleType: string | null;
}

/** 注册页上可选的配送区域 */
export interface AreaOption {
  id: number;
  areaName: string;
  orgName: string;
}

export interface LoginResult {
  token: string;
  /** 令牌多少秒后过期 */
  expiresIn: number;
  profile: Profile;
}

export interface TokenResult {
  token: string;
  expiresIn: number;
}

export interface TaskSummary {
  /** 今天的任务总数 = 还没完成的 + 今天已签收的 */
  total: number;
  toAccept: number;
  accepted: number;
  inTransit: number;
  exception: number;
  signedToday: number;
}

export interface Task {
  id: number;
  waybillNo: string;
  status: TaskStatus;
  areaName: string | null;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  receiverLat: number | null;
  receiverLng: number | null;
  packageCount: number;
  weightKg: number | null;
  goodsDesc: string;
  /** 代收货款：签收时要向客户收取的金额，0 表示不用收 */
  codAmount: number;
  expectedAt: string | null;
  assignedAt: string | null;
  acceptedAt: string | null;
  departedAt: string | null;
  signedAt: string | null;
  signerName: string;
  signRemark: string;
  /** 异常类型；不是异常状态时为空字符串 */
  exceptionType: ExceptionType | '';
  exceptionRemark: string;
  cancelledAt: string | null;
  remark: string;
}

/** 轨迹里的一步。action、refCode 是代码；content 是数据（司机姓名、签收人、原因），原样显示 */
export interface TaskTrack {
  action: string;
  /** 上报异常时是异常类型，其余为空字符串 */
  refCode: string;
  content: string;
  operatorType: 'USER' | 'DRIVER' | 'SYSTEM';
  createdAt: string;
}

export interface TaskDetail {
  task: Task;
  /** 按时间从早到晚 */
  tracks: TaskTrack[];
}

export interface PageResult<T> {
  records: T[];
  total: number;
  page: number;
  size: number;
}

/** 上报给后台的一个定位点 */
export interface LocationPoint {
  lat: number;
  lng: number;
  /** 精度（米） */
  accuracy: number | null;
  /** 速度（米/秒） */
  speed: number | null;
  /** 方向（度，正北为 0） */
  heading: number | null;
  /** 手机上取到这个位置的时间（ISO 格式） */
  recordedAt: string;
}
