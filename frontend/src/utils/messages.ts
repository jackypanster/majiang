/**
 * Chinese UI messages and text constants
 *
 * Following FR-018 Chinese language requirement
 */

// Button labels
export const BUTTON_LABELS = {
  START_GAME: '开始游戏',
  CONFIRM_BURY: '确认埋牌',
  PONG: '碰',
  KONG: '杠',
  HU: '胡',
  PASS: '过',
  RETRY: '重试',
  CONFIRM: '确定',
  CANCEL: '取消',
  NEW_GAME: '再来一局'
};

// Game phase labels
export const PHASE_LABELS = {
  BURYING: '埋牌阶段',
  PLAYING: '游戏进行中',
  ENDED: '游戏结束'
};

// Toast messages
export const TOAST_MESSAGES = {
  BURY_SUCCESS: '埋牌成功',
  BURY_INVALID_COUNT: '请选择3张牌',
  BURY_INVALID_SUIT: '埋牌必须是同一花色',
  DISCARD_SUCCESS: '出牌成功',
  DISCARD_INVALID: '请先打出缺门牌',
  ACTION_SUCCESS: '操作成功',
  CONNECTION_ERROR: '网络连接失败',
  BACKEND_ERROR: '后端服务错误'
};

// Modal titles
export const MODAL_TITLES = {
  WIN: '胡牌',
  BLOOD_BATTLE_CONTINUE: '血战继续',
  GAME_END: '游戏结束',
  CONNECTION_ERROR: '连接失败',
  CONFIRM_ACTION: '确认操作'
};

// Info labels
export const INFO_LABELS = {
  CURRENT_TURN: '当前回合',
  WALL_REMAINING: '剩余',
  TILES_COUNT: '张',
  SCORE: '得分',
  MISSING_SUIT: '缺',
  HAND_LOCKED: '已锁定',
  BURIED_CARDS: '埋牌',
  FAN_COUNT: '番',
  SCORE_CHANGE: '分数变化'
};

// Suit names
export const SUIT_NAMES = {
  WAN: '万',
  TIAO: '条',
  TONG: '筒'
};

// Error messages
export const ERROR_MESSAGES = {
  BACKEND_NOT_RUNNING: '后端服务未启动，请运行后端服务',
  NETWORK_ERROR: '网络连接失败，请检查后端服务',
  WINDOW_SIZE_TOO_SMALL: '窗口太小，请调整窗口大小（最小 1280x720）',
  INVALID_ACTION: '无效操作',
  GAME_NOT_FOUND: '游戏不存在',
  PLAYER_NOT_FOUND: '玩家不存在'
};

export default {
  BUTTON_LABELS,
  PHASE_LABELS,
  TOAST_MESSAGES,
  MODAL_TITLES,
  INFO_LABELS,
  SUIT_NAMES,
  ERROR_MESSAGES
};
