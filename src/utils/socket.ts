import { io } from "socket.io-client";
import { ref } from 'vue';

// 连接状态
export const connectionStatus = ref<'connected' | 'disconnected' | 'connecting'>('connecting');

// 配置Socket.IO选项
const socket = io(window.location.origin, {
  reconnection: true,        // 启用自动重连
  reconnectionAttempts: 5,   // 最大重连次数
  reconnectionDelay: 1000,   // 重连延迟(ms)
  timeout: 10000,            // 连接超时时间
});

// 心跳检测间隔(ms)
const HEARTBEAT_INTERVAL = 30000;
let heartbeatTimer: ReturnType<typeof setInterval>;

// 开始心跳
function startHeartbeat() {
  heartbeatTimer = setInterval(() => {
    if (socket.connected) {
      socket.emit('ping');
    }
  }, HEARTBEAT_INTERVAL);
}

// 停止心跳
function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }
}

// 发送聊天消息到服务器
function sendChatMessage(data: object) {
  if (socket.connected) {
    socket.emit('chat', data);
    return true;
  } else {
    console.warn('Socket未连接，消息发送失败');
    return false;
  }
}

// 监听连接状态
socket.on('connect', () => {
  console.log('已连接到服务器');
  connectionStatus.value = 'connected';
  startHeartbeat();
});

socket.on('disconnect', (reason) => {
  console.log('与服务器断开连接:', reason);
  connectionStatus.value = 'disconnected';
  stopHeartbeat();
});

socket.on('connect_error', (error) => {
  console.error('连接错误:', error);
  connectionStatus.value = 'disconnected';
});

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log(`正在尝试重连... (第${attemptNumber}次)`);
  connectionStatus.value = 'connecting';
});

socket.on('pong', () => {
  console.debug('收到服务器心跳响应');
});

// 导出重连方法
export function reconnect() {
  if (!socket.connected) {
    socket.connect();
  }
}

export { socket, sendChatMessage };