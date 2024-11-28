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
          <template v-for="(msg, index) in uploadResult" :key="index">
            <div
              v-if="msg.sender === 'system'"
              class="d-flex mb-4"
            >
              <v-avatar color="primary" size="40" class="mr-3">OS</v-avatar>
              <v-card max-width="80%" variant="outlined" class="pa-3">
                <div class="text-body-1">{{ msg.text }}</div>
              </v-card>
            </div>
            <div
              v-else
              class="d-flex mb-4 justify-end"
            >
              <v-card max-width="80%" variant="outlined" class="pa-3 user-message">
                <div class="text-body-1">{{ msg.text }}</div>
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
  text: string
}

// 添加模型相关的类型和变量
interface Model {
  id: string
  name: string
}

// 可用的模型列表
const availableModels = ref<Model[]>([
  { id: 'Qwen/Qwen2.5-7B-Instruct', name: 'Qwen2.5-7B' },
  { id: 'Qwen/Qwen2.5-14B-Instruct', name: 'Qwen2.5-14B' },
  { id: 'Qwen/Qwen2.5-32B-Instruct', name: 'Qwen2.5-32B' },
])

// 当前选中的模型
const selectedModel = ref<Model>(availableModels.value[0])

// 选择模型的方法
function selectModel(model: Model) {
  selectedModel.value = model
}

// 常量定义
const WELCOME_MESSAGE = '👋 你好呀，我是 OmniSteward，你的智能管家，有什么需要尽管告诉我~'

// 状态变量
const speechStatus = ref('未检测到语音')
const vadStatus = ref('未加载')
const uploadStatus = ref('')
const isVADRunning = ref(false)
const inputMessage = ref('')
const history_id = ref(null)
// 聊天相关状态
const uploadResult = ref<ChatMessage[]>([])
const streamingResult = ref<string[]>([])

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

// 网络请求相关函数
async function sendAudioToServer(audioData: Float32Array) {
  try {
    uploadStatus.value = '正在上传...'
    streamingResult.value = []
    const formData = new FormData()
    
    const audioBlob = float32ArrayToWav(audioData)
    const timestamp = new Date().getTime()
    const filename = `speech_${timestamp}.wav`
    
    formData.append('audio', audioBlob, filename)
    formData.append('model', selectedModel.value.id)
    if(history_id.value){
      formData.append('history_id', history_id.value)
    }
    const response = await fetch(`${window.location.origin}/api/upload-audio`, {
      method: 'POST',
      body: formData
    })

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法获取响应流')
    }

    uploadStatus.value = '接收中...'
    
    // 读取流数据
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      // 将 Uint8Array 转换为文本
      const text = new TextDecoder().decode(value)
      streamingResult.value.push(text)
      console.log(text);
      uploadResult.value.push({ sender: 'system', text })
    }
    
    uploadStatus.value = '完成'
  } catch (error: any) {
    uploadStatus.value = `失败: ${error.message}`
    console.error('上传音频时出错:', error)
  }
}

async function sendMessage() {
  if (!inputMessage.value.trim()) return
  
  const message = inputMessage.value
  uploadResult.value.push({ sender: 'user', text: message })
  inputMessage.value = ''

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
    
    let buffer = '' // 用于存储未完成的数据块
    
    // 读取流数据
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      const text = new TextDecoder().decode(value)
      buffer += text
      
      // 按 <split> 分割数据块
      const chunks = buffer.split('<split>')
      
      // 处理除最后一块外的所有完整数据块（直接作为文本处理）
      for (let i = 0; i < chunks.length - 1; i++) {
        const chunk = chunks[i]
        if (!chunk.trim()) continue
        
        console.log("文本块:", chunk)
        streamingResult.value.push(chunk)
        uploadResult.value.push({ sender: 'system', text: chunk })
      }
      
      // 保存最后一个不完整的数据块
      buffer = chunks[chunks.length - 1]
    }
    
    // 处理最后可能剩余的数据（尝试解析为JSON）
    if (buffer.trim()) {
      try {
        const jsonData = JSON.parse(buffer)
        if (jsonData.history_id) {
          history_id.value = jsonData.history_id
          // uploadResult.value.push({ sender: 'system', text: '已更新对话ID' })
          console.log('更新history_id:', history_id.value)
        }
      } catch (jsonError) {
        // 如果解析失败，作为普通文本处理
        if (buffer.trim()) {
          streamingResult.value.push(buffer)
          uploadResult.value.push({ sender: 'system', text: buffer })
        }
      }
    }
  } catch (error: any) {
    console.error('发送消息失败:', error)
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
  uploadResult.value = []
  streamingResult.value = []
  inputMessage.value = ''
  history_id.value = null
  
  uploadResult.value.push({
    sender: 'system',
    text: WELCOME_MESSAGE
  })
}

// 生命周期钩子
onMounted(async () => {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('您的浏览器不支持音频输入设备')
    }

    await navigator.mediaDevices.getUserMedia({ audio: true })
    vadStatus.value = '已加载'
    
    if (uploadResult.value.length === 0) {
      uploadResult.value.push({
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
