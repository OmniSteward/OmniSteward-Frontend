<template>
  <v-app>
    <!-- 顶部导航栏 -->
    <v-app-bar app color="white" elevation="1" fixed>
      <v-app-bar-nav-icon></v-app-bar-nav-icon>
      <v-app-bar-title>OmniSteward</v-app-bar-title>
      <v-spacer></v-spacer>
      
      <!-- 添加模型选择菜单 -->
      <v-menu>
        <template v-slot:activator="{ props }">
          <v-btn
            v-bind="props"
            variant="text"
          >
            {{ selectedModel.name }}
            <v-icon right>mdi-chevron-down</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item
            v-for="model in availableModels"
            :key="model.id"
            :value="model"
            @click="selectModel(model)"
          >
            <v-list-item-title>{{ model.name }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

      <v-btn icon><v-icon>mdi-volume-off</v-icon></v-btn>
      <v-btn icon><v-icon>mdi-refresh</v-icon></v-btn>
    </v-app-bar>

    <!-- 聊天内容区域 -->
    <v-main class="chat-container">
      <v-container class="pt-16">
        <!-- 系统状态信息 -->
        <v-card v-if="vadStatus !== '已加载'" class="mb-4" variant="text">
          <v-card-text class="text-center text-body-2">
            <v-icon :color="vadStatus === '已加载' ? 'success' : 'error'" size="small" class="mr-1">
              {{ vadStatus === '已加载' ? 'mdi-check-circle' : 'mdi-alert-circle' }}
            </v-icon>
            VAD模型状态: {{ vadStatus }}
          </v-card-text>
        </v-card>

        <!-- 聊天消息 -->
        <div class="chat-messages overflow-y-auto">
          <!-- 动态消息列表 -->
          <template v-for="(msg, index) in chatHistory" :key="index">
            <div
              v-if="msg.sender === 'system'"
              class="d-flex mb-4"
            >
              <v-avatar color="primary" size="40" class="mr-3">OS</v-avatar>
              <v-card max-width="80%" variant="outlined" class="pa-3">
                <div v-if="msg.text" class="text-body-1">{{ msg.text }}</div>
                <div v-if="msg.html" class="text-body-2" v-html="msg.html"></div>
              </v-card>
            </div>
            <div
              v-else
              class="d-flex mb-4 justify-end"
            >
              <v-card max-width="80%" variant="outlined" class="pa-3 user-message">
                <div v-if="msg.text" class="text-body-1">{{ msg.text }}</div>
                <div v-if="msg.html" class="text-body-2" v-html="msg.html"></div>
              </v-card>
              <v-avatar color="primary" size="40" class="ml-3">U</v-avatar>
            </div>
          </template>
        </div>
      </v-container>
    </v-main>

    <!-- 底部输入区域 -->
    <v-footer app class="pa-0" fixed>
      <v-card width="100%" flat>
        <v-card-text class="pa-2">
          <v-row no-gutters align="center">
            <v-col>
              <v-text-field
                v-model="inputMessage"
                density="compact"
                variant="outlined"
                hide-details
                placeholder="有什么问题尽管问我"
                append-inner-icon="mdi-send"
                :disabled="false"
                @keyup.enter="sendMessage"
                @click:append-inner="sendMessage"
              ></v-text-field>
            </v-col>
            <v-col cols="auto" class="ml-2">
              <v-btn
                :color="isVADRunning ? 'error' : 'primary'"
                :disabled="vadStatus === '加载中...'"
                @click="toggleVAD"
                icon
              >
                <v-icon>{{ isVADRunning ? 'mdi-stop' : 'mdi-microphone' }}</v-icon>
              </v-btn>
            </v-col>
            <v-col cols="auto">
              <v-btn 
                icon 
                variant="text" 
                @click="clearHistory"
                title="新建对话"
              >
                <v-icon>mdi-plus-circle-outline</v-icon>
              </v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-footer>
  </v-app>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'

// 类型定义
interface ChatMessage {
  sender: 'user' | 'system'
  text?: string
  html?: string
}

// 添加模型相关的类型和变量
interface Model {
  id: string
  name: string
}

// 可用的模型列表
const availableModels = ref<Model[]>([
  // 添加一个默认模型
  { id: 'default', name: '默认模型' }
])

// 修改当前选中的模型的定义
const selectedModel = ref<Model>(availableModels.value[0])

// 修改获取模型列表的函数
async function fetchModels() {
  try {
    const response = await fetch(`${window.location.origin}/api/models`)
    console.log(response)
    const models = await response.json()
    availableModels.value = models.map((model: any) => ({
      id: model.id,
      name: model.name || model.id
    }))
    // 确保在设置新的模型列表后更新选中的模型
    selectedModel.value = availableModels.value[0] || { id: 'default', name: '默认模型' }
  } catch (error) {
    console.error('获取模型列表失败:', error)
    // 发生错误时保持使用默认模型
    selectedModel.value = { id: 'default', name: '默认模型' }
  }
}

// 选择模型的方法
function selectModel(model: Model) {
  selectedModel.value = model
}

// 常量定义
const WELCOME_MESSAGE = '👋 你好呀，我是 OmniSteward，你的智能管家，有什么需要尽管告诉我~'

// 状态变量
const speechStatus = ref('未检测到语音')
const vadStatus = ref('未加载')
const isVADRunning = ref(false)
const inputMessage = ref('')
const history_id = ref(null)
// 聊天相关状态
const chatHistory = ref<ChatMessage[]>([])

// VAD 实例
let myvad: any = null

// 音频处理函数
function float32ArrayToWav(audioData: Float32Array, sampleRate = 16000): Blob {
  // 创建 WAV 文件头
  const wavHeader = new ArrayBuffer(44)
  const view = new DataView(wavHeader)
  
  // WAV 文件头格式
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  writeString(view, 0, 'RIFF')  // RIFF标识
  view.setUint32(4, 32 + audioData.length * 2, true)  // 文件大小
  writeString(view, 8, 'WAVE')  // WAVE标识
  writeString(view, 12, 'fmt ')  // fmt 块标识
  view.setUint32(16, 16, true)  // fmt 块大小
  view.setUint16(20, 1, true)   // 音频格式 (PCM)
  view.setUint16(22, 1, true)   // 声道数
  view.setUint32(24, sampleRate, true)  // 采样率
  view.setUint32(28, sampleRate * 2, true)  // 字节率
  view.setUint16(32, 2, true)   // 块对齐
  view.setUint16(34, 16, true)  // 采样位数
  writeString(view, 36, 'data')  // data块标识
  view.setUint32(40, audioData.length * 2, true)  // 音频数据大小

  // 转换音频数据
  const audioArray = new Int16Array(audioData.length)
  for (let i = 0; i < audioData.length; i++) {
    const s = Math.max(-1, Math.min(1, audioData[i]))
    audioArray[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
  }

  // 合并文件头和音频数据
  const blob = new Blob([wavHeader, audioArray], { type: 'audio/wav' })
  return blob
}

async function handleAction(action: any) {
  console.log('收到动作:', action)
  if (action.type === "create_download") {
    const url = action.url;
    const file_name = action.file_name;
    // 创建一个按钮夹在system消息中
    chatHistory.value.push({
      sender: 'system',
      html: `<a href="${url}" download="${file_name}">点击下载 ${file_name}</a>`
    })
  }else{
    console.error('收到未知动作:', action)
  }
}

async function handleReader(reader: any) {
  let buffer = ''
  
  // 添加处理数据块的辅助函数
  const processChunk = (chunk: string) => {
    if (!chunk.trim()) return
    
    try {
      const jsonData = JSON.parse(chunk)
      if (jsonData.type === "history") {
        history_id.value = jsonData.history_id
        console.log('更新history_id:', history_id.value)
      } else if (jsonData.type === "content") {
        chatHistory.value.push({
          sender: 'system',
          text: jsonData.content
        })
      } else if (jsonData.type === "action") {
        // 处理动作消息
        handleAction(jsonData.action)
      }else{
        console.error('收到未知消息:', jsonData)
      }
    } catch (jsonError) {
      console.error('解析JSON失败:', jsonError)
    }
  }
    
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    const text = new TextDecoder().decode(value)
    buffer += text
    
    const chunks = buffer.split('<split>')
    
    // 处理完整的数据块
    for (let i = 0; i < chunks.length - 1; i++) {
      processChunk(chunks[i])
    }
    
    buffer = chunks[chunks.length - 1]
  }
  
  // 处理最后剩余的数据
  if (buffer.trim()) {
    processChunk(buffer)
  }
}

// 网络请求相关函数
async function sendAudioToServer(audioData: Float32Array) {
  try {
    const formData = new FormData()
    
    const audioBlob = float32ArrayToWav(audioData)
    const timestamp = new Date().getTime()
    const filename = `speech_${timestamp}.wav`
    
    formData.append('audio', audioBlob, filename)
    
    const response = await fetch(`${window.location.origin}/api/transcribe`, {
      method: 'POST',
      body: formData
    })
    const text = (await response.json())['text']
    sendMessageToServer(text)
    
    
  } catch (error: any) {
    console.error('上传音频时出错:', error)
  }
}

async function sendMessage() {
  if (!inputMessage.value.trim()) return
  const message = inputMessage.value
  inputMessage.value = ''
  sendMessageToServer(message)
}

async function sendMessageToServer(message: string) {
  chatHistory.value.push({ sender: 'user', text: message })
  const payload = {
    query: message,
    model: selectedModel.value.id,
    history_id: history_id.value
  }
  
  try {
    const response = await fetch(`${window.location.origin}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })
    
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法获取响应流')
    }
    handleReader(reader)
  } catch (error: any) {
    console.error('发送消息时出错:', error)
  }
}

// VAD 控制函数
async function toggleVAD() {
  if (isVADRunning.value) {
    // 停止 VAD
    if (myvad) {
      await myvad.stop()
      isVADRunning.value = false
      speechStatus.value = '未检测到语音'
    }
  } else {
    // 启动 VAD
    try {
      if (!myvad) {
        // 首次初始化 VAD
        const { MicVAD } = (window as any).vad
        myvad = await MicVAD.new({
          onSpeechStart: () => {
            speechStatus.value = '正在说话'
          },
          onSpeechEnd: async (audioData: Float32Array) => {
            speechStatus.value = '未检测到语音'
            // 停止 VAD
            await myvad.pause()
            isVADRunning.value = false
            // 发送音频数据
            await sendAudioToServer(audioData)
          }
        })
      }
      await myvad.start()
      isVADRunning.value = true
    } catch (error: any) {
      vadStatus.value = '加载失败'
      console.error('VAD初始化失败:', error)
      speechStatus.value = `错误: ${error.message || '未知错误'}`
    }
  }
}

// 聊天管理函数
function clearHistory() {
  chatHistory.value = []
  inputMessage.value = ''
  history_id.value = null
  
  chatHistory.value.push({
    sender: 'system',
    text: WELCOME_MESSAGE
  })
}

// 生命周期钩子
onMounted(async () => {
  await fetchModels()
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('您的浏览器不支持音频输入设备')
    }

    await navigator.mediaDevices.getUserMedia({ audio: true })
    vadStatus.value = '已加载'
    
    if (chatHistory.value.length === 0) {
      chatHistory.value.push({
        sender: 'system',
        text: WELCOME_MESSAGE 
      })
    }
  } catch (error: any) {
    vadStatus.value = '加载失败'
    console.error('VAD初始化失败:', error)
    speechStatus.value = `错误: ${error.message || '未知错误'}`
  }
})
</script>

<style scoped>
.chat-container {
  height: calc(100vh - 64px - 56px);
  overflow: hidden;
}

.chat-messages {
  height: 100%;
  overflow-y: auto;
}

.justify-end {
  justify-content: flex-end;
}

.user-message {
  background-color: #e0f7fa;
}
</style>
