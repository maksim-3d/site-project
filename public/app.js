const socket = io();
let currentUser = null;
let selectedUser = null;
let currentGroup = null;
let currentChatType = null;
let currentChatId = null;
let token = null;
let unreadMessages = new Map();
let isUserAtBottom = true;
let onlineUsers = new Set();
let messageIds = new Set();

// Проверка мобильного устройства
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
console.log('📱 Мобильное устройство:', isMobile ? 'Да' : 'Нет');

// LiveKit конфигурация
const LIVEKIT_URL = 'https://chat-xsa7ohkp.livekit.cloud';

// DOM элементы
const chatDiv = document.getElementById('chat');
const userList = document.getElementById('userList');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const currentUserSpan = document.getElementById('currentUser');
const chatWith = document.getElementById('chatWith');
const logoutBtn = document.getElementById('logout');
const searchUser = document.getElementById('searchUser');
const searchResults = document.getElementById('searchResults');
const themeToggle = document.getElementById('themeToggle');
const userAvatar = document.getElementById('userAvatar');
const scrollToBottomBtn = document.getElementById('scrollToBottomBtn');
const profileBtn = document.getElementById('profileBtn');
const botBtn = document.getElementById('botBtn');
const wallpaperBtn = document.getElementById('wallpaperBtn');
const audioCallBtn = document.getElementById('audioCallBtn');
const videoCallBtn = document.getElementById('videoCallBtn');
const backToChat = document.getElementById('backToChat');
const profileDiv = document.getElementById('profile');
const profilePic = document.getElementById('profilePic');
const profilePicInput = document.getElementById('profilePicInput');
const changePicBtn = document.getElementById('changePicBtn');
const bio = document.getElementById('bio');
const customUsername = document.getElementById('customUsername');
const profileForm = document.getElementById('profileForm');
const emojiBtn = document.getElementById('emojiBtn');
const attachBtn = document.getElementById('attachBtn');
const fileInput = document.getElementById('fileInput');
const wallpaperInput = document.getElementById('wallpaperInput');
const chatHeaderAvatar = document.querySelector('.chat-header-avatar');
const chatHeaderStatus = document.querySelector('.chat-header-status');

// Модальные окна
const userProfileModal = document.getElementById('userProfileModal');
const closeUserProfileModal = document.getElementById('closeUserProfileModal');
const userProfileModalTitle = document.getElementById('userProfileModalTitle');
const userProfileModalPic = document.getElementById('userProfileModalPic');
const userProfileModalUsername = document.getElementById('userProfileModalUsername');
const userProfileModalBio = document.getElementById('userProfileModalBio');
const giftsCount = document.getElementById('giftsCount');
const giftsList = document.getElementById('giftsList');
const myGiftsCount = document.getElementById('myGiftsCount');
const myGiftsList = document.getElementById('myGiftsList');
const myStars = document.getElementById('myStars');
const userProfileModalStars = document.getElementById('userProfileModalStars');

// Call элементы
const callModal = document.getElementById('callModal');
const callModalTitle = document.getElementById('callModalTitle');
const callCloseBtn = document.getElementById('callCloseBtn');
const toggleAudioBtn = document.getElementById('toggleAudioBtn');
const toggleVideoBtn = document.getElementById('toggleVideoBtn');
const endCallBtn = document.getElementById('endCallBtn');
const liveKitContainer = document.getElementById('liveKitContainer');

// Константы
const defaultAvatar = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="45" height="45"%3E%3Crect fill="%23007bff" width="45" height="45" rx="22.5"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="white" font-size="18"%3E👤%3C/text%3E%3C/svg%3E';
const defaultProfilePic = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150"%3E%3Crect fill="%23e0e0e0" width="150" height="150" rx="75"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="48"%3E👤%3C/text%3E%3C/svg%3E';
const commonEmojis = ['😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🔥', '✨', '🎉', '😢', '😡'];

let typingTimer;
let isTyping = false;
const TYPING_TIMEOUT = 2000;

// Хранилище последних сообщений
if (!window.lastMessages) window.lastMessages = new Map();
if (!window.lastGroupMessages) window.lastGroupMessages = new Map();
let allChats = [];

// ============= МОБИЛЬНЫЕ СТИЛИ =============
if (isMobile) {
  const mobileStyles = document.createElement('style');
  mobileStyles.textContent = `
    .pc-interface { display: none !important; }
    #chat { display: block !important; height: 100vh; overflow: hidden; }
    .mobile-top-bar {
      display: flex !important;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      z-index: 1000;
      padding: 0 16px;
      align-items: center;
      justify-content: space-between;
    }
    .mobile-top-left { display: flex; align-items: center; gap: 12px; cursor: pointer; }
    .mobile-avatar { width: 40px; height: 40px; border-radius: 50%; background-size: cover; background-position: center; border: 2px solid var(--accent-color); }
    .mobile-user-name { font-weight: 600; font-size: 16px; color: var(--text-primary); }
    .mobile-top-right { display: flex; gap: 8px; }
    .mobile-btn { width: 40px; height: 40px; border-radius: 50%; border: none; background: var(--bg-tertiary); color: var(--text-primary); font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .mobile-btn.bot-btn { background: var(--accent-color); color: white; }
    .mobile-friends-list {
      position: fixed;
      top: 60px;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--bg-primary);
      z-index: 999;
      overflow-y: auto;
      padding: 16px;
    }
    .mobile-friends-list.hidden { display: none; }
    .mobile-friends-header { padding: 16px 0; font-size: 20px; font-weight: 600; border-bottom: 1px solid var(--border-color); color: var(--text-primary); }
    .mobile-search { width: 100%; padding: 12px 16px; border: 1px solid var(--border-color); border-radius: 25px; background: var(--input-bg); color: var(--text-primary); font-size: 14px; margin: 16px 0; }
    .mobile-chats-list { margin-top: 8px; }
    .mobile-chat-item {
      display: flex;
      align-items: center;
      padding: 12px;
      border-radius: 12px;
      background: var(--bg-secondary);
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .mobile-chat-item:active { background: var(--hover-bg); transform: scale(0.98); }
    .mobile-chat-avatar-wrapper { position: relative; width: 50px; height: 50px; margin-right: 12px; flex-shrink: 0; }
    .mobile-chat-avatar-img { width: 50px; height: 50px; border-radius: 50%; background-size: cover; background-position: center; }
    .mobile-chat-info-item { flex: 1; min-width: 0; }
    .mobile-chat-name-item { font-weight: 600; font-size: 16px; margin-bottom: 4px; color: var(--text-primary); }
    .mobile-chat-last-message { font-size: 12px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mobile-chat-meta { flex-shrink: 0; margin-left: 8px; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .mobile-chat-time { font-size: 10px; color: var(--text-secondary); }
    .mobile-unread-badge { background: var(--accent-color); color: white; min-width: 20px; height: 20px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; padding: 0 6px; }
    .mobile-online-dot { position: absolute; bottom: 2px; right: 2px; width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--bg-secondary); }
    .mobile-online-dot.online { background: #4caf50 !important; }
    .mobile-online-dot.offline { background: #9e9e9e !important; }
    .mobile-chat {
      position: fixed;
      top: 60px;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--bg-primary);
      z-index: 1000;
      display: none;
      flex-direction: column;
    }
    .mobile-chat.active { display: flex; }
    .mobile-chat-header {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
    }
    .mobile-back-btn { background: none; border: none; color: var(--text-primary); font-size: 24px; cursor: pointer; padding: 0 8px 0 0; }
    .mobile-chat-info { flex: 1; display: flex; align-items: center; gap: 12px; cursor: pointer; }
    .mobile-chat-avatar { width: 40px; height: 40px; border-radius: 50%; background-size: cover; background-position: center; flex-shrink: 0; }
    .mobile-chat-details { display: flex; flex-direction: column; }
    .mobile-chat-name { font-weight: 600; font-size: 16px; color: var(--text-primary); }
    .mobile-chat-status { font-size: 12px; color: var(--text-secondary); display: flex; align-items: center; gap: 4px; }
    .mobile-chat-actions { display: flex; gap: 8px; }
    .mobile-call-btn { width: 36px; height: 36px; border-radius: 50%; border: none; background: var(--bg-tertiary); color: var(--text-primary); font-size: 16px; cursor: pointer; }
    .mobile-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .mobile-message { max-width: 80%; margin-bottom: 8px; }
    .mobile-message.sent { align-self: flex-end; }
    .mobile-message.received { align-self: flex-start; }
    .mobile-message-content { padding: 10px 14px; border-radius: 18px; background: var(--message-received); color: var(--text-primary); word-wrap: break-word; font-size: 14px; }
    .mobile-message.sent .mobile-message-content { background: var(--message-sent); color: white; }
    .mobile-message-time { font-size: 10px; color: var(--text-secondary); margin-top: 4px; text-align: right; }
    .mobile-input-area {
      display: flex;
      align-items: flex-end;
      padding: 12px 16px;
      background: var(--bg-secondary);
      border-top: 1px solid var(--border-color);
      gap: 8px;
    }
    .mobile-input-area textarea {
      flex: 1;
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 10px 16px;
      background: var(--input-bg);
      color: var(--text-primary);
      font-size: 14px;
      resize: none;
      max-height: 100px;
      min-height: 40px;
      font-family: inherit;
    }
    .mobile-input-area textarea:focus { outline: none; border-color: var(--accent-color); }
    .mobile-send-btn { width: 44px; height: 44px; border-radius: 50%; border: none; background: var(--accent-color); color: white; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .online-indicator, .offline-indicator { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }
    .online-indicator { background: #4caf50; }
    .offline-indicator { background: #9e9e9e; }
    .no-friends { text-align: center; padding: 2rem; color: var(--text-secondary); }
    #mobileAudioCall, #mobileVideoCall, #mobileAddMemberBtn { display: none; }
  `;
  document.head.appendChild(mobileStyles);
}

// ============= ФУНКЦИИ ДЛЯ ГРУПП =============

function createGroup() {
  const name = prompt('Введите название группы:');
  if (!name) return;
  
  const description = prompt('Введите описание группы (необязательно):');
  
  fetch('/api/groups/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ name, description: description || '' })
  })
  .then(res => res.json())
  .then(data => {
    if (data.id) {
      alert('✅ Группа создана!');
      if (isMobile) loadAllChats();
      else loadPCChats();
    } else {
      alert('❌ Ошибка: ' + (data.error || 'Неизвестная ошибка'));
    }
  })
  .catch(err => {
    console.error('Error creating group:', err);
    alert('❌ Ошибка при создании группы');
  });
}

function selectGroup(groupId) {
  console.log('📁 Выбрана группа:', groupId);
  
  currentChatType = 'group';
  currentChatId = groupId;
  currentGroup = groupId;
  selectedUser = null;
  
  if (chatWith) chatWith.textContent = 'Групповой чат';
  if (chatHeaderAvatar) {
    chatHeaderAvatar.style.backgroundImage = `url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ffffff"%3E%3Cpath d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm8 6h-8v-2c0-2.21-1.79-4-4-4H4c-2.21 0-4 1.79-4 4v2H0v2h24v-2zM4 7c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"/%3E%3C/svg%3E')`;
    chatHeaderAvatar.style.backgroundSize = '60%';
    chatHeaderAvatar.style.backgroundPosition = 'center';
    chatHeaderAvatar.style.backgroundColor = 'var(--accent-color)';
  }
  if (chatHeaderStatus) chatHeaderStatus.innerHTML = '<span class="online-indicator"></span> Групповой чат';
  
  if (window.mobileChatName) window.mobileChatName.textContent = 'Групповой чат';
  if (window.mobileChatAvatar) {
    window.mobileChatAvatar.style.backgroundImage = `url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ffffff"%3E%3Cpath d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm8 6h-8v-2c0-2.21-1.79-4-4-4H4c-2.21 0-4 1.79-4 4v2H0v2h24v-2zM4 7c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"/%3E%3C/svg%3E')`;
    window.mobileChatAvatar.style.backgroundSize = '60%';
    window.mobileChatAvatar.style.backgroundPosition = 'center';
    window.mobileChatAvatar.style.backgroundColor = 'var(--accent-color)';
  }
  if (window.mobileChatStatus) window.mobileChatStatus.innerHTML = '<span class="online-indicator"></span> Групповой чат';
  
  if (messageInput) {
    messageInput.disabled = false;
    messageInput.placeholder = 'Сообщение в группу...';
  }
  if (window.mobileMessageInput) {
    window.mobileMessageInput.disabled = false;
    window.mobileMessageInput.placeholder = 'Сообщение в группу...';
  }
  
  const addMemberBtn = document.getElementById('addMemberBtn');
  if (addMemberBtn) addMemberBtn.style.display = 'flex';
  if (window.mobileAddMemberBtn) window.mobileAddMemberBtn.style.display = 'flex';
  if (window.mobileAudioCall) window.mobileAudioCall.style.display = 'none';
  if (window.mobileVideoCall) window.mobileVideoCall.style.display = 'none';
  
  if (messagesDiv) {
    messagesDiv.innerHTML = '';
    messageIds.clear();
  }
  if (window.mobileMessages) {
    window.mobileMessages.innerHTML = '';
    messageIds.clear();
  }
  
  fetch(`/api/groups/${groupId}/messages`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => res.json())
  .then(messages => {
    if (messagesDiv) {
      messages.forEach(msg => displayGroupMessage(msg));
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    if (window.mobileMessages) {
      messages.forEach(msg => displayMobileGroupMessage(msg));
      window.mobileMessages.scrollTop = window.mobileMessages.scrollHeight;
    }
  })
  .catch(err => console.error('Error loading group messages:', err));
}

function displayGroupMessage(message) {
  if (!messagesDiv) return;
  if (messageIds.has(message.id)) return;
  messageIds.add(message.id);
  
  const div = document.createElement('div');
  div.className = `message ${message.sender_id === currentUser?.id ? 'sent' : 'received'}`;
  div.setAttribute('data-message-id', message.id);
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.style.backgroundImage = `url('${message.profile_pic || defaultAvatar}')`;
  avatar.style.backgroundSize = 'cover';
  avatar.style.backgroundPosition = 'center';
  avatar.onclick = () => openUserProfile(message.sender_id);
  
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  
  let messageHtml = '';
  if (message.sender_id !== currentUser?.id) {
    messageHtml += `<strong style="color: var(--accent-color); display: block; margin-bottom: 4px;">${escapeHtml(message.sender_name || 'Пользователь')}</strong>`;
  }
  messageHtml += `<div class="message-text">${escapeHtml(message.content)}</div>`;
  
  bubble.innerHTML = messageHtml;
  
  const time = document.createElement('div');
  time.className = 'message-timestamp';
  time.textContent = new Date(message.timestamp).toLocaleTimeString();
  
  div.appendChild(avatar);
  div.appendChild(bubble);
  div.appendChild(time);
  messagesDiv.appendChild(div);
}

function displayMobileGroupMessage(message) {
  if (!window.mobileMessages) return;
  
  const div = document.createElement('div');
  div.className = `mobile-message ${message.sender_id === currentUser?.id ? 'sent' : 'received'}`;
  
  let messageContent = message.content;
  if (messageContent && messageContent.length > 100) {
    messageContent = messageContent.substring(0, 97) + '...';
  }
  
  div.innerHTML = `
    <div class="mobile-message-content">
      ${message.sender_id !== currentUser?.id ? `<strong style="color: var(--accent-color);">${escapeHtml(message.sender_name)}</strong><br>` : ''}
      ${escapeHtml(messageContent)}
    </div>
    <div class="mobile-message-time">${new Date(message.timestamp).toLocaleTimeString()}</div>
  `;
  
  window.mobileMessages.appendChild(div);
  window.mobileMessages.scrollTop = window.mobileMessages.scrollHeight;
}

function addMemberToGroup(groupId, username) {
  fetch('/api/users', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => res.json())
  .then(users => {
    const user = users.find(u => u.username === username || u.custom_username === username);
    if (!user) {
      alert('❌ Пользователь не найден');
      return;
    }
    
    fetch(`/api/groups/${groupId}/add-member`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ userId: user.id })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert('✅ Пользователь добавлен в группу');
      } else {
        alert('❌ Ошибка: ' + (data.error || 'Не удалось добавить пользователя'));
      }
    });
  })
  .catch(err => console.error('Error finding user:', err));
}

// ============= ФУНКЦИИ ДЛЯ ЛИЧНЫХ СООБЩЕНИЙ =============

function selectUser(user) {
  console.log('👤 Выбор пользователя:', user.username);
  
  currentChatType = 'user';
  currentChatId = user.id;
  selectedUser = user;
  currentGroup = null;
  
  if (chatWith) {
    const displayName = user.custom_username ? `@${user.custom_username}` : user.username;
    chatWith.innerHTML = getRoleDisplay(user.role, displayName);
  }
  if (chatHeaderAvatar) {
    const avatarUrl = user.profile_pic || defaultAvatar;
    chatHeaderAvatar.style.backgroundImage = `url('${avatarUrl}')`;
    chatHeaderAvatar.style.backgroundSize = 'cover';
    chatHeaderAvatar.style.backgroundPosition = 'center';
    chatHeaderAvatar.style.backgroundColor = 'transparent';
  }
  const isOnline = onlineUsers.has(parseInt(user.id));
  if (chatHeaderStatus) {
    chatHeaderStatus.innerHTML = isOnline ? 
      '<span class="online-indicator"></span> в сети' : 
      '<span class="offline-indicator"></span> не в сети';
  }
  
  if (window.mobileChatName) {
    const displayName = user.custom_username ? `${user.username} (@${user.custom_username})` : user.username;
    window.mobileChatName.textContent = displayName;
  }
  if (window.mobileChatAvatar) {
    const avatarUrl = user.profile_pic || defaultAvatar;
    window.mobileChatAvatar.style.backgroundImage = `url('${avatarUrl}')`;
    window.mobileChatAvatar.style.backgroundSize = 'cover';
    window.mobileChatAvatar.style.backgroundPosition = 'center';
    window.mobileChatAvatar.style.backgroundColor = 'transparent';
  }
  if (window.mobileChatStatus) {
    window.mobileChatStatus.innerHTML = isOnline ? 
      '<span class="online-indicator"></span> в сети' : 
      '<span class="offline-indicator"></span> не в сети';
  }
  
  if (messageInput) {
    messageInput.disabled = false;
    messageInput.placeholder = `Сообщение для ${user.username}...`;
  }
  if (window.mobileMessageInput) {
    window.mobileMessageInput.disabled = false;
    window.mobileMessageInput.placeholder = `Сообщение для ${user.username}...`;
  }
  
  const addMemberBtn = document.getElementById('addMemberBtn');
  if (addMemberBtn) addMemberBtn.style.display = 'none';
  if (window.mobileAddMemberBtn) window.mobileAddMemberBtn.style.display = 'none';
  if (window.mobileAudioCall) window.mobileAudioCall.style.display = 'flex';
  if (window.mobileVideoCall) window.mobileVideoCall.style.display = 'flex';
  
  if (messagesDiv) {
    messagesDiv.innerHTML = '';
    messageIds.clear();
  }
  if (window.mobileMessages) {
    window.mobileMessages.innerHTML = '';
    messageIds.clear();
  }
  
  fetch(`/api/messages/${user.id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => res.json())
  .then(messages => {
    console.log(`📨 Загружено ${messages.length} сообщений для ${user.username}`);
    if (messagesDiv) {
      if (messages.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'no-messages';
        emptyDiv.textContent = 'Нет сообщений. Напишите что-нибудь!';
        messagesDiv.appendChild(emptyDiv);
      } else {
        messages.forEach(msg => displayMessage(msg));
      }
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    if (window.mobileMessages) {
      if (messages.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'no-messages';
        emptyDiv.textContent = 'Нет сообщений. Напишите что-нибудь!';
        window.mobileMessages.appendChild(emptyDiv);
      } else {
        messages.forEach(msg => displayMobileMessage(msg));
      }
      window.mobileMessages.scrollTop = window.mobileMessages.scrollHeight;
    }
  })
  .catch(error => {
    console.error('❌ Ошибка загрузки сообщений:', error);
    if (window.mobileMessages) {
      window.mobileMessages.innerHTML = '<div class="no-messages">Ошибка загрузки сообщений</div>';
    }
  });
  
  localStorage.setItem('selectedUserId', user.id);
}

function displayMessage(message) {
  if (!messagesDiv) return;
  if (messageIds.has(message.id)) return;
  messageIds.add(message.id);
  
  const div = document.createElement('div');
  div.className = `message ${message.sender_id === currentUser?.id ? 'sent' : 'received'}`;
  div.setAttribute('data-message-id', message.id);
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.style.backgroundImage = `url('${message.profile_pic || defaultAvatar}')`;
  avatar.style.backgroundSize = 'cover';
  avatar.style.backgroundPosition = 'center';
  avatar.onclick = () => openUserProfile(message.sender_id);
  
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  
  let messageContent = message.content || 'Пустое сообщение';
  
  try {
    if (message.content && message.content.startsWith('{') && message.content.includes('"type":"file"')) {
      const fileData = JSON.parse(message.content);
      if (fileData.type === 'file') {
        if (fileData.isImage && fileData.fileData) {
          messageContent = `<img src="${fileData.fileData}" style="max-width: 200px; max-height: 200px; border-radius: 8px; cursor: pointer;" onclick="window.open('${fileData.fileData}')">`;
        } else if (fileData.isVideo && fileData.fileData) {
          messageContent = `<video src="${fileData.fileData}" controls style="max-width: 200px; max-height: 200px; border-radius: 8px;"></video>`;
        } else if (fileData.isExe || fileData.fileName.endsWith('.exe')) {
          messageContent = `<div class="file-info" onclick="downloadFile('${fileData.fileData}', '${fileData.fileName}')">
            <span class="file-icon">⚙️</span>
            <div class="file-details">
              <div class="file-name">${escapeHtml(fileData.fileName)}</div>
              <div class="file-size">${(fileData.fileSize / 1024 / 1024).toFixed(2)} MB</div>
              <div class="file-warning" style="color: #ffaa00; font-size: 10px;">⚠️ Исполняемый файл</div>
            </div>
          </div>`;
        } else {
          messageContent = `<div class="file-info" onclick="downloadFile('${fileData.fileData}', '${fileData.fileName}')">
            <span class="file-icon">📎</span>
            <div class="file-details">
              <div class="file-name">${escapeHtml(fileData.fileName)}</div>
              <div class="file-size">${(fileData.fileSize / 1024).toFixed(1)} KB</div>
            </div>
          </div>`;
        }
      }
    }
  } catch (e) {}
  
  bubble.innerHTML = messageContent;
  
  const time = document.createElement('div');
  time.className = 'message-timestamp';
  time.textContent = message.timestamp ? 
    new Date(message.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : 
    new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  
  div.appendChild(avatar);
  div.appendChild(bubble);
  div.appendChild(time);
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function displayMobileMessage(message) {
  if (!window.mobileMessages) return;
  if (messageIds.has(message.id)) return;
  messageIds.add(message.id);
  
  const div = document.createElement('div');
  div.className = `mobile-message ${message.sender_id === currentUser?.id ? 'sent' : 'received'}`;
  
  let messageContent = message.content || 'Пустое сообщение';
  
  try {
    if (message.content && message.content.startsWith('{') && message.content.includes('"type":"file"')) {
      const fileData = JSON.parse(message.content);
      if (fileData.type === 'file') {
        if (fileData.isImage) {
          messageContent = `📷 Изображение: ${fileData.fileName}`;
        } else if (fileData.isVideo) {
          messageContent = `🎥 Видео: ${fileData.fileName}`;
        } else {
          messageContent = `📎 Файл: ${fileData.fileName}`;
        }
      }
    }
  } catch (e) {}
  
  if (messageContent && messageContent.length > 100) {
    messageContent = messageContent.substring(0, 97) + '...';
  }
  
  div.innerHTML = `
    <div class="mobile-message-content">${escapeHtml(messageContent)}</div>
    <div class="mobile-message-time">${new Date(message.timestamp).toLocaleTimeString()}</div>
  `;
  
  window.mobileMessages.appendChild(div);
  window.mobileMessages.scrollTop = window.mobileMessages.scrollHeight;
}

function sendMessage() {
  if (!messageInput) return;
  const content = messageInput.value.trim();
  if (!content) return;
  
  console.log('📤 Отправка сообщения, currentChatType:', currentChatType);
  
  if (currentChatType === 'user' && selectedUser) {
    console.log('📤 Отправка личного сообщения пользователю:', selectedUser.id);
    
    const tempMessage = {
      id: Date.now(),
      sender_id: currentUser.id,
      receiver_id: selectedUser.id,
      content: content,
      timestamp: new Date().toISOString(),
      sender_username: currentUser.username,
      profile_pic: currentUser.profile_pic
    };
    
    displayMessage(tempMessage);
    
    socket.emit('sendMessage', { token, receiverId: selectedUser.id, content });
    messageInput.value = '';
    messageInput.style.height = '44px';
    
    setTimeout(() => {
      if (isMobile) loadAllChats();
      else loadPCChats();
    }, 100);
    
  } else if (currentChatType === 'group' && currentGroup) {
    console.log('📤 Отправка сообщения в группу:', currentGroup);
    
    const tempMessage = {
      id: Date.now(),
      group_id: currentGroup,
      sender_id: currentUser.id,
      sender_name: currentUser.username,
      profile_pic: currentUser.profile_pic,
      content: content,
      timestamp: new Date().toISOString()
    };
    
    displayGroupMessage(tempMessage);
    
    fetch(`/api/groups/${currentGroup}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        messageInput.value = '';
        messageInput.style.height = '44px';
        if (isMobile) loadAllChats();
        else loadPCChats();
      }
    })
    .catch(err => console.error('Error sending group message:', err));
  }
}

function sendMobileMessage() {
  if (!window.mobileMessageInput) return;
  const content = window.mobileMessageInput.value.trim();
  if (!content) return;
  
  if (currentChatType === 'user' && selectedUser) {
    socket.emit('sendMessage', { token, receiverId: selectedUser.id, content });
    window.mobileMessageInput.value = '';
    window.mobileMessageInput.style.height = 'auto';
    setTimeout(() => loadAllChats(), 500);
  } else if (currentChatType === 'group' && currentGroup) {
    fetch(`/api/groups/${currentGroup}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        window.mobileMessageInput.value = '';
        window.mobileMessageInput.style.height = 'auto';
        setTimeout(() => loadAllChats(), 500);
      }
    })
    .catch(err => console.error('Error sending group message:', err));
  }
}

// ============= ОБЪЕДИНЕННЫЙ СПИСОК ЧАТОВ =============

function loadAllChats() {
  if (!window.mobileChatsList || !token) return;
  
  Promise.all([
    fetch('/api/friends', { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json()),
    fetch('/api/groups', { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json())
  ])
  .then(([friends, groups]) => {
    const chats = [];
    
    friends.forEach(friend => {
      const lastMsg = window.lastMessages.get(parseInt(friend.id));
      chats.push({
        id: friend.id,
        type: 'user',
        name: friend.custom_username ? `${friend.username} (@${friend.custom_username})` : friend.username,
        avatar: friend.profile_pic,
        lastMessage: lastMsg ? (lastMsg.sender_id === currentUser?.id ? 'Вы: ' : '') + lastMsg.content : '',
        lastMessageTime: lastMsg ? lastMsg.timestamp : null,
        lastMessageTimestamp: lastMsg ? new Date(lastMsg.timestamp).getTime() : 0,
        unread: unreadMessages.get(parseInt(friend.id)) || 0,
        isOnline: onlineUsers.has(parseInt(friend.id)),
        role: friend.role
      });
    });
    
    groups.forEach(group => {
      const lastMsg = window.lastGroupMessages.get(parseInt(group.id));
      chats.push({
        id: group.id,
        type: 'group',
        name: group.name,
        avatar: null,
        lastMessage: lastMsg ? (lastMsg.sender_id === currentUser?.id ? 'Вы: ' : '') + lastMsg.content : '',
        lastMessageTime: lastMsg ? lastMsg.timestamp : null,
        lastMessageTimestamp: lastMsg ? new Date(lastMsg.timestamp).getTime() : 0,
        unread: 0,
        role: group.role
      });
    });
    
    chats.sort((a, b) => {
      const timeA = a.lastMessageTimestamp || 0;
      const timeB = b.lastMessageTimestamp || 0;
      return timeB - timeA;
    });
    
    allChats = chats;
    renderChatsList(chats);
  })
  .catch(err => console.error('Error loading chats:', err));
}

function renderChatsList(chats) {
  if (!window.mobileChatsList) return;
  
  if (chats.length === 0) {
    window.mobileChatsList.innerHTML = '<div class="no-friends">Нет чатов</div>';
    return;
  }
  
  window.mobileChatsList.innerHTML = chats.map(chat => {
    const avatarUrl = chat.type === 'user' && chat.avatar ? chat.avatar : 
                      (chat.type === 'group' ? 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ffffff"%3E%3Cpath d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm8 6h-8v-2c0-2.21-1.79-4-4-4H4c-2.21 0-4 1.79-4 4v2H0v2h24v-2zM4 7c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"/%3E%3C/svg%3E' : defaultAvatar);
    
    const avatarBg = chat.type === 'group' ? 'linear-gradient(135deg, var(--accent-color), #00aaff)' : '';
    const isOnline = chat.type === 'user' && chat.isOnline;
    
    let timeStr = '';
    if (chat.lastMessageTime) {
      const msgDate = new Date(chat.lastMessageTime);
      const now = new Date();
      const diffMs = now - msgDate;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) {
        timeStr = 'только что';
      } else if (diffMins < 60) {
        timeStr = `${diffMins} мин`;
      } else if (diffHours < 24) {
        timeStr = `${diffHours} ч`;
      } else if (diffDays < 7) {
        timeStr = `${diffDays} д`;
      } else {
        timeStr = msgDate.toLocaleDateString();
      }
    }
    
    return `
      <div class="mobile-chat-item" data-type="${chat.type}" data-id="${chat.id}">
        <div class="mobile-chat-avatar-wrapper">
          <div class="mobile-chat-avatar-img" style="background-image: url('${avatarUrl}'); background-size: cover; background-position: center; ${avatarBg ? `background: ${avatarBg};` : ''}">
          </div>
          ${chat.type === 'user' ? `<span class="mobile-online-dot ${isOnline ? 'online' : 'offline'}"></span>` : ''}
        </div>
        <div class="mobile-chat-info-item">
          <div class="mobile-chat-name-item">${escapeHtml(chat.name)} ${chat.type === 'group' ? '👥' : ''}</div>
          <div class="mobile-chat-last-message">${chat.lastMessage ? escapeHtml(chat.lastMessage.substring(0, 50)) + (chat.lastMessage.length > 50 ? '...' : '') : 'Нет сообщений'}</div>
        </div>
        <div class="mobile-chat-meta">
          ${timeStr ? `<div class="mobile-chat-time">${timeStr}</div>` : ''}
          ${chat.unread > 0 ? `<div class="mobile-unread-badge">${chat.unread > 99 ? '99+' : chat.unread}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
  
  document.querySelectorAll('.mobile-chat-item').forEach(item => {
    item.addEventListener('click', () => {
      const type = item.dataset.type;
      const id = parseInt(item.dataset.id);
      
      if (type === 'user') {
        fetch(`/api/user/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(user => {
          selectUser(user);
          if (window.mobileFriendsList) window.mobileFriendsList.classList.add('hidden');
          if (window.mobileChat) window.mobileChat.classList.add('active');
        });
      } else if (type === 'group') {
        selectGroup(id);
        if (window.mobileFriendsList) window.mobileFriendsList.classList.add('hidden');
        if (window.mobileChat) window.mobileChat.classList.add('active');
      }
    });
  });
}

// ============= ПК ВЕРСИЯ =============

function loadPCChats() {
  if (!userList || !token) return;
  
  Promise.all([
    fetch('/api/friends', { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json()),
    fetch('/api/groups', { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json())
  ])
  .then(([friends, groups]) => {
    const chats = [];
    
    friends.forEach(friend => {
      const lastMsg = window.lastMessages.get(parseInt(friend.id));
      chats.push({
        id: friend.id,
        type: 'user',
        name: friend.custom_username ? `${friend.username} (@${friend.custom_username})` : friend.username,
        avatar: friend.profile_pic,
        lastMessage: lastMsg ? (lastMsg.sender_id === currentUser?.id ? 'Вы: ' : '') + lastMsg.content : '',
        lastMessageTime: lastMsg ? lastMsg.timestamp : null,
        lastMessageTimestamp: lastMsg ? new Date(lastMsg.timestamp).getTime() : 0,
        unread: unreadMessages.get(parseInt(friend.id)) || 0,
        isOnline: onlineUsers.has(parseInt(friend.id)),
        role: friend.role
      });
    });
    
    groups.forEach(group => {
      const lastMsg = window.lastGroupMessages.get(parseInt(group.id));
      chats.push({
        id: group.id,
        type: 'group',
        name: group.name,
        avatar: null,
        lastMessage: lastMsg ? (lastMsg.sender_id === currentUser?.id ? 'Вы: ' : '') + lastMsg.content : '',
        lastMessageTime: lastMsg ? lastMsg.timestamp : null,
        lastMessageTimestamp: lastMsg ? new Date(lastMsg.timestamp).getTime() : 0,
        unread: 0,
        role: group.role
      });
    });
    
    chats.sort((a, b) => {
      const timeA = a.lastMessageTimestamp || 0;
      const timeB = b.lastMessageTimestamp || 0;
      return timeB - timeA;
    });
    
    renderPCChatsList(chats);
  })
  .catch(err => console.error('Error loading PC chats:', err));
}

function renderPCChatsList(chats) {
  if (!userList) return;
  
  userList.innerHTML = chats.map(chat => {
    const avatarUrl = chat.type === 'user' && chat.avatar ? chat.avatar : 
                      (chat.type === 'group' ? 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ffffff"%3E%3Cpath d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm8 6h-8v-2c0-2.21-1.79-4-4-4H4c-2.21 0-4 1.79-4 4v2H0v2h24v-2zM4 7c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"/%3E%3C/svg%3E' : defaultAvatar);
    
    const isOnline = chat.type === 'user' && chat.isOnline;
    const unread = chat.unread || 0;
    
    return `
      <div class="user-item ${currentChatType === chat.type && currentChatId === chat.id ? 'active' : ''}" data-type="${chat.type}" data-id="${chat.id}">
        <div class="user-avatar-container">
          <div class="user-avatar-small" style="background-image: url('${avatarUrl}'); background-size: cover; background-position: center; ${chat.type === 'group' ? 'background: linear-gradient(135deg, var(--accent-color), #00aaff);' : ''}"></div>
          ${chat.type === 'user' ? `<span class="online-dot ${isOnline ? 'online' : 'offline'}"></span>` : ''}
        </div>
        <div class="user-info">
          <div class="user-name">${getRoleDisplay(chat.role, escapeHtml(chat.name))} ${chat.type === 'group' ? '👥' : ''}</div>
          <div class="user-status">${chat.lastMessage ? escapeHtml(chat.lastMessage.substring(0, 40)) + (chat.lastMessage.length > 40 ? '...' : '') : 'Нет сообщений'}</div>
        </div>
        ${unread > 0 ? `<div class="user-meta"><span class="unread-badge">${unread > 99 ? '99+' : unread}</span></div>` : ''}
      </div>
    `;
  }).join('');
  
  document.querySelectorAll('.user-item').forEach(item => {
    item.addEventListener('click', () => {
      const type = item.dataset.type;
      const id = parseInt(item.dataset.id);
      
      if (type === 'user') {
        fetch(`/api/user/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(user => {
          selectUser(user);
        });
      } else if (type === 'group') {
        selectGroup(id);
      }
    });
  });
}

// ============= МОБИЛЬНЫЙ ИНТЕРФЕЙС =============

function initMobileInterface() {
  console.log('📱 Создание мобильного интерфейса');
  
  const pcInterface = document.querySelector('.pc-interface');
  if (pcInterface) pcInterface.style.display = 'none';
  
  createMobileElements();
  updateMobileUserInfo();
  loadAllChats();
  
  setInterval(loadAllChats, 5000);
}

function createMobileElements() {
  const topBar = document.createElement('div');
  topBar.id = 'mobileTopBar';
  topBar.className = 'mobile-top-bar';
  topBar.innerHTML = `
    <div class="mobile-top-left" id="mobileProfileClick">
      <div class="mobile-avatar" id="mobileAvatar"></div>
      <span class="mobile-user-name" id="mobileUserName"></span>
    </div>
    <div class="mobile-top-right">
      <button class="mobile-btn" id="mobileThemeToggle">${document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙'}</button>
      <button class="mobile-btn bot-btn" id="mobileBotBtn">🤖</button>
      <button class="mobile-btn" id="mobileLogout">🚪</button>
    </div>
  `;
  document.body.appendChild(topBar);
  
  const chatsList = document.createElement('div');
  chatsList.id = 'mobileFriendsList';
  chatsList.className = 'mobile-friends-list';
  chatsList.innerHTML = `
    <div class="mobile-friends-header">Чаты</div>
    <input type="text" class="mobile-search" id="mobileSearch" placeholder="🔍 Поиск...">
    <div class="mobile-chats-list" id="mobileChatsList"></div>
  `;
  document.body.appendChild(chatsList);
  
  const chat = document.createElement('div');
  chat.id = 'mobileChat';
  chat.className = 'mobile-chat';
  chat.innerHTML = `
    <div class="mobile-chat-header">
      <button class="mobile-back-btn" id="mobileBackBtn">←</button>
      <div class="mobile-chat-info" id="mobileChatInfo">
        <div class="mobile-chat-avatar" id="mobileChatAvatar"></div>
        <div class="mobile-chat-details">
          <span class="mobile-chat-name" id="mobileChatName"></span>
          <span class="mobile-chat-status" id="mobileChatStatus"></span>
        </div>
      </div>
      <div class="mobile-chat-actions">
        <button class="mobile-call-btn" id="mobileAudioCall">🎤</button>
        <button class="mobile-call-btn" id="mobileVideoCall">📹</button>
        <button class="mobile-call-btn" id="mobileAddMemberBtn">👥</button>
      </div>
    </div>
    <div class="mobile-messages" id="mobileMessages"></div>
    <div class="mobile-input-area">
      <textarea id="mobileMessageInput" placeholder="Сообщение..." rows="1"></textarea>
      <button class="mobile-send-btn" id="mobileSendButton">📤</button>
    </div>
  `;
  document.body.appendChild(chat);
  
  window.mobileAvatar = document.getElementById('mobileAvatar');
  window.mobileUserName = document.getElementById('mobileUserName');
  window.mobileThemeToggle = document.getElementById('mobileThemeToggle');
  window.mobileBotBtn = document.getElementById('mobileBotBtn');
  window.mobileLogout = document.getElementById('mobileLogout');
  window.mobileSearch = document.getElementById('mobileSearch');
  window.mobileChatsList = document.getElementById('mobileChatsList');
  window.mobileBackBtn = document.getElementById('mobileBackBtn');
  window.mobileChatInfo = document.getElementById('mobileChatInfo');
  window.mobileChatAvatar = document.getElementById('mobileChatAvatar');
  window.mobileChatName = document.getElementById('mobileChatName');
  window.mobileChatStatus = document.getElementById('mobileChatStatus');
  window.mobileMessages = document.getElementById('mobileMessages');
  window.mobileMessageInput = document.getElementById('mobileMessageInput');
  window.mobileSendButton = document.getElementById('mobileSendButton');
  window.mobileAddMemberBtn = document.getElementById('mobileAddMemberBtn');
  window.mobileAudioCall = document.getElementById('mobileAudioCall');
  window.mobileVideoCall = document.getElementById('mobileVideoCall');
  window.mobileFriendsList = chatsList;
  window.mobileChat = chat;
  
  addMobileEventListeners();
}

function addMobileEventListeners() {
  const profileClick = document.getElementById('mobileProfileClick');
  if (profileClick) {
    profileClick.addEventListener('click', () => openMobileProfile());
  }
  
  if (window.mobileThemeToggle) {
    window.mobileThemeToggle.addEventListener('click', toggleTheme);
  }
  
  if (window.mobileBotBtn) {
    window.mobileBotBtn.addEventListener('click', () => window.location.href = '/bot.html');
  }
  
  if (window.mobileLogout) {
    window.mobileLogout.addEventListener('click', handleLogout);
  }
  
  if (window.mobileBackBtn) {
    window.mobileBackBtn.addEventListener('click', () => {
      if (window.mobileChat) window.mobileChat.classList.remove('active');
      if (window.mobileFriendsList) window.mobileFriendsList.classList.remove('hidden');
      currentGroup = null;
      selectedUser = null;
      loadAllChats();
    });
  }
  
  if (window.mobileChatInfo) {
    window.mobileChatInfo.addEventListener('click', () => {
      if (selectedUser) openUserProfile(selectedUser.id);
    });
  }
  
  if (window.mobileSendButton) {
    window.mobileSendButton.addEventListener('click', () => sendMobileMessage());
  }
  
  if (window.mobileMessageInput) {
    window.mobileMessageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMobileMessage();
      }
    });
    window.mobileMessageInput.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = (this.scrollHeight) + 'px';
    });
    window.mobileMessageInput.addEventListener('input', handleMobileTyping);
  }
  
  if (window.mobileAudioCall) {
    window.mobileAudioCall.addEventListener('click', () => selectedUser && startCall('audio'));
  }
  if (window.mobileVideoCall) {
    window.mobileVideoCall.addEventListener('click', () => selectedUser && startCall('video'));
  }
  
  if (window.mobileAddMemberBtn) {
    window.mobileAddMemberBtn.addEventListener('click', () => {
      if (currentGroup) {
        const username = prompt('Введите имя пользователя (без @):');
        if (username) addMemberToGroup(currentGroup, username);
      }
    });
  }
  
  if (window.mobileSearch) {
    window.mobileSearch.addEventListener('input', function(e) {
      const query = e.target.value.toLowerCase().trim();
      const filteredChats = allChats.filter(chat => 
        chat.name.toLowerCase().includes(query)
      );
      renderChatsList(filteredChats);
    });
  }
}

function updateMobileUserInfo() {
  if (!currentUser) return;
  const displayName = currentUser.custom_username ? `@${currentUser.custom_username}` : currentUser.username;
  if (window.mobileUserName) window.mobileUserName.textContent = displayName;
  if (window.mobileAvatar) {
    const avatarUrl = currentUser.profile_pic || defaultAvatar;
    window.mobileAvatar.style.backgroundImage = `url('${avatarUrl}')`;
    window.mobileAvatar.style.backgroundSize = 'cover';
    window.mobileAvatar.style.backgroundPosition = 'center';
  }
}

function openMobileProfile() {
  if (!currentUser) return;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 350px; padding: 1.5rem;">
      <div class="modal-header">
        <h2>Мой профиль</h2>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div style="text-align: center;">
        <div style="width: 100px; height: 100px; border-radius: 50%; margin: 0 auto; overflow: hidden;">
          <img src="${currentUser.profile_pic || defaultProfilePic}" style="width: 100%; height: 100%; object-fit: cover;">
        </div>
        <h3>${currentUser.custom_username ? `@${currentUser.custom_username}` : currentUser.username}</h3>
        <p>${currentUser.bio || 'Нет описания'}</p>
        <div class="stars">⭐ ${currentUser.stars || 0} звёзд</div>
        <button class="save-btn" onclick="window.location.href='/profile.html'">Редактировать</button>
        <button class="save-btn" style="margin-top: 10px; background: var(--accent-color);" onclick="createGroup(); this.closest('.modal-overlay').remove();">➕ Создать группу</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// ============= ОСНОВНЫЕ ФУНКЦИИ =============

function initApp() {
  console.log('🚀 Инициализация приложения');
  
  if (isMobile) {
    initMobileInterface();
  } else {
    if (chatDiv) chatDiv.classList.remove('hidden');
  }
  
  updateUserInfo();
  socket.emit('join', currentUser.id);
  socket.emit('userOnline', currentUser.id);
  
  if (!isMobile) {
    loadPCChats();
  }
  
  loadWallpaper();
  addEventListeners();
  
  const loadingScreen = document.getElementById('loadingScreen');
  if (loadingScreen) loadingScreen.classList.add('hidden');
  
  const savedSelectedUserId = localStorage.getItem('selectedUserId');
  if (savedSelectedUserId && savedSelectedUserId !== 'null' && savedSelectedUserId !== 'undefined') {
    setTimeout(() => {
      fetch('/api/friends', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(friends => {
        const savedUser = friends.find(f => f.id == savedSelectedUserId);
        if (savedUser) {
          selectUser(savedUser);
        }
        localStorage.removeItem('selectedUserId');
      })
      .catch(err => console.error('Error loading saved user:', err));
    }, 500);
  }
  
  setInterval(() => {
    if (currentUser) socket.emit('userOnline', currentUser.id);
  }, 30000);
}

function addEventListeners() {
  if (!isMobile) {
    profileBtn?.addEventListener('click', openProfile);
    botBtn?.addEventListener('click', () => window.location.href = '/bot.html');
    logoutBtn?.addEventListener('click', handleLogout);
    themeToggle?.addEventListener('click', toggleTheme);
    searchUser?.addEventListener('input', searchUsers);
    sendButton?.addEventListener('click', sendMessage);
    wallpaperBtn?.addEventListener('click', () => selectedUser && wallpaperInput.click());
    audioCallBtn?.addEventListener('click', () => selectedUser && startCall('audio'));
    videoCallBtn?.addEventListener('click', () => selectedUser && startCall('video'));
    attachBtn?.addEventListener('click', () => fileInput.click());
    fileInput?.addEventListener('change', handleFileSelect);
    wallpaperInput?.addEventListener('change', handleWallpaperSelect);
    emojiBtn?.addEventListener('click', showEmojiPicker);
    backToChat?.addEventListener('click', closeProfile);
    changePicBtn?.addEventListener('click', () => profilePicInput.click());
    profilePicInput?.addEventListener('change', handleProfilePicChange);
    profileForm?.addEventListener('submit', updateProfile);
    messageInput?.addEventListener('input', handleTyping);
    chatHeaderAvatar?.addEventListener('click', () => {
      if (selectedUser) openUserProfile(selectedUser.id);
    });
  }
  
  messageInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  messagesDiv?.addEventListener('scroll', handleScroll);
  scrollToBottomBtn?.addEventListener('click', scrollToBottom);
  closeUserProfileModal?.addEventListener('click', () => userProfileModal?.classList.add('hidden'));
  userProfileModal?.addEventListener('click', (e) => {
    if (e.target === userProfileModal) userProfileModal.classList.add('hidden');
  });
  callCloseBtn?.addEventListener('click', endCall);
  endCallBtn?.addEventListener('click', endCall);
  toggleAudioBtn?.addEventListener('click', toggleAudio);
  toggleVideoBtn?.addEventListener('click', toggleVideo);
}

function handleLogout() {
  if (currentUser) socket.emit('userOffline', currentUser.id);
  token = currentUser = selectedUser = null;
  localStorage.clear();
  window.location.href = '/login.html';
}

function toggleTheme() {
  const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  const text = newTheme === 'dark' ? '☀️' : '🌙';
  if (themeToggle) themeToggle.textContent = text;
  if (window.mobileThemeToggle) window.mobileThemeToggle.textContent = text;
  localStorage.setItem('theme', newTheme);
}

function handleScroll() {
  if (!messagesDiv) return;
  const distance = messagesDiv.scrollHeight - messagesDiv.scrollTop - messagesDiv.clientHeight;
  isUserAtBottom = distance < 50;
  if (scrollToBottomBtn) scrollToBottomBtn.classList.toggle('hidden', isUserAtBottom);
}

function scrollToBottom() {
  if (messagesDiv) {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    isUserAtBottom = true;
    if (scrollToBottomBtn) scrollToBottomBtn.classList.add('hidden');
  }
}

function updateUserInfo() {
  if (!currentUser) return;
  const displayName = currentUser.custom_username ? `@${currentUser.custom_username}` : currentUser.username;
  if (currentUserSpan) currentUserSpan.innerHTML = getRoleDisplay(currentUser.role, displayName);
  if (userAvatar) {
    const avatarUrl = currentUser.profile_pic || defaultAvatar;
    userAvatar.style.backgroundImage = `url('${avatarUrl}')`;
    userAvatar.style.backgroundSize = 'cover';
    userAvatar.style.backgroundPosition = 'center';
  }
  updateMobileUserInfo();
}

function searchUsers() {
  if (!searchUser || !searchResults) return;
  const query = searchUser.value.trim();
  if (query.length < 2) {
    searchResults.classList.add('hidden');
    return;
  }
  
  fetch('/api/users', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(response => response.json())
  .then(users => {
    const cleanQuery = query.replace(/^@+/, '').toLowerCase();
    const filtered = users.filter(u => 
      u.username.toLowerCase().includes(cleanQuery) ||
      (u.custom_username && u.custom_username.toLowerCase().includes(cleanQuery))
    );
    
    searchResults.innerHTML = filtered.map(user => {
      const displayName = user.custom_username ? 
        `${user.username} (@${user.custom_username})` : user.username;
      return `
        <div class="search-result">
          <span>${escapeHtml(displayName)} ${user.role === 'bot' ? '🤖' : ''}</span>
          <button class="add-friend-btn" onclick="addFriend(${user.id})">Добавить</button>
        </div>
      `;
    }).join('');
    
    searchResults.classList.remove('hidden');
  })
  .catch(error => console.error('Search error:', error));
}

async function addFriend(friendId) {
  try {
    const response = await fetch('/api/add-friend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ friendId })
    });
    
    if (response.ok) {
      alert('Друг добавлен!');
      if (searchUser) searchUser.value = '';
      if (searchResults) searchResults.classList.add('hidden');
      if (!isMobile) loadPCChats();
      if (isMobile) loadAllChats();
    } else {
      const data = await response.json();
      alert(data.error);
    }
  } catch (error) {
    console.error('Add friend error:', error);
  }
}

function openProfile() {
  if (!currentUser) return;
  chatDiv?.classList.add('hidden');
  profileDiv?.classList.remove('hidden');
  
  if (profilePic) profilePic.src = currentUser.profile_pic || defaultProfilePic;
  if (customUsername) customUsername.value = currentUser.custom_username || '';
  if (bio) bio.value = currentUser.bio || '';
  if (myStars) myStars.innerHTML = `Звёзды: ${Math.min(9999, currentUser.stars || 0)}`;
  
  fetch(`/api/user/${currentUser.id}/gifts`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(r => r.json())
  .then(giftsData => {
    if (myGiftsCount) myGiftsCount.textContent = giftsData.total;
    if (myGiftsList) {
      myGiftsList.innerHTML = '';
      giftsData.gifts.forEach(gift => {
        for (let i = 0; i < gift.count; i++) {
          const img = document.createElement('img');
          img.src = getGiftGif(gift.gift_type);
          img.className = 'gift-gif';
          myGiftsList.appendChild(img);
        }
      });
    }
  });
}

function closeProfile() {
  profileDiv?.classList.add('hidden');
  chatDiv?.classList.remove('hidden');
  updateUserInfo();
}

function handleProfilePicChange(e) {
  const file = e.target.files[0];
  if (!file || !profilePic) return;
  
  if (file.size > 5 * 1024 * 1024) {
    alert('Файл слишком большой. Максимальный размер 5MB');
    return;
  }
  if (!file.type.startsWith('image/')) {
    alert('Пожалуйста, выберите изображение');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (event) => {
    const newAvatar = event.target.result;
    profilePic.src = newAvatar;
    if (userAvatar) {
      userAvatar.style.backgroundImage = `url('${newAvatar}')`;
    }
    if (window.mobileAvatar) {
      window.mobileAvatar.style.backgroundImage = `url('${newAvatar}')`;
    }
    
    if (currentUser) {
      currentUser.profile_pic = newAvatar;
      localStorage.setItem('user', JSON.stringify(currentUser));
      
      fetch('/api/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ profile_pic: newAvatar })
      })
      .then(res => res.json())
      .then(result => {
        if (result.message) {
          console.log('✅ Аватар обновлен на сервере');
          if (!isMobile) loadPCChats();
          if (isMobile) loadAllChats();
        }
      })
      .catch(err => console.error('Error updating avatar:', err));
    }
  };
  reader.readAsDataURL(file);
}

async function updateProfile(e) {
  e.preventDefault();
  
  const customUsernameValue = customUsername?.value.trim().replace(/^@+/, '') || '';
  if (customUsernameValue && customUsernameValue.length < 5) {
    alert('Имя должно быть не менее 5 символов');
    return;
  }
  
  const data = {
    custom_username: customUsernameValue,
    bio: bio?.value || ''
  };
  
  if (profilePic?.src.startsWith('data:') && profilePic.src !== currentUser.profile_pic) {
    data.profile_pic = profilePic.src;
  }
  
  try {
    const response = await fetch('/api/update-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (response.ok) {
      alert('✅ Профиль обновлён!');
      if (currentUser) {
        currentUser.custom_username = data.custom_username;
        currentUser.bio = data.bio;
        if (data.profile_pic) {
          currentUser.profile_pic = data.profile_pic;
          updateUserAvatar(currentUser.id, data.profile_pic);
        }
        localStorage.setItem('user', JSON.stringify(currentUser));
        updateUserInfo();
      }
      closeProfile();
    } else {
      alert(result.error || 'Ошибка');
    }
  } catch (error) {
    console.error('Update error:', error);
    alert('Ошибка сети');
  }
}

function updateUserAvatar(userId, avatarUrl) {
  document.querySelectorAll(`.user-item[data-user-id="${userId}"] .user-avatar-small, .mobile-user-item[data-user-id="${userId}"] .mobile-user-avatar`).forEach(el => {
    el.style.backgroundImage = `url('${avatarUrl}')`;
  });
  
  if (selectedUser && selectedUser.id === userId && chatHeaderAvatar) {
    chatHeaderAvatar.style.backgroundImage = `url('${avatarUrl}')`;
  }
  if (window.mobileChatAvatar && selectedUser && selectedUser.id === userId) {
    window.mobileChatAvatar.style.backgroundImage = `url('${avatarUrl}')`;
  }
  
  if (currentUser && currentUser.id === userId) {
    if (userAvatar) userAvatar.style.backgroundImage = `url('${avatarUrl}')`;
    if (window.mobileAvatar) window.mobileAvatar.style.backgroundImage = `url('${avatarUrl}')`;
    if (profilePic) profilePic.src = avatarUrl;
  }
}

// Функция отправки файла (исправленная с лимитом 150MB)
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file || !selectedUser) return;
  
  // Увеличен лимит до 150MB
  if (file.size > 150 * 1024 * 1024) {
    alert('Файл слишком большой. Максимальный размер 150MB');
    return;
  }
  
  // Показываем прогресс загрузки
  const progressDiv = document.createElement('div');
  progressDiv.className = 'upload-progress';
  progressDiv.innerHTML = `
    <div class="upload-info">
      <span class="upload-filename">${escapeHtml(file.name)}</span>
      <span class="upload-percent">0%</span>
    </div>
    <div class="upload-progress-bar"><div class="upload-progress-fill" style="width:0%"></div></div>
  `;
  
  const uploadStatus = document.getElementById('uploadStatus');
  if (uploadStatus) {
    uploadStatus.classList.remove('hidden');
    uploadStatus.innerHTML = '';
    uploadStatus.appendChild(progressDiv);
  }
  
  const reader = new FileReader();
  
  reader.onprogress = (event) => {
    if (event.lengthComputable) {
      const percent = (event.loaded / event.total) * 100;
      const percentSpan = progressDiv.querySelector('.upload-percent');
      const fillDiv = progressDiv.querySelector('.upload-progress-fill');
      if (percentSpan) percentSpan.textContent = Math.round(percent) + '%';
      if (fillDiv) fillDiv.style.width = percent + '%';
    }
  };
  
  reader.onload = (event) => {
    const fileData = event.target.result;
    
    let messageContent = '';
    let fileIcon = '📎';
    
    if (file.type.startsWith('image/')) {
      fileIcon = '📷';
      messageContent = `📷 Изображение: ${file.name}`;
    } else if (file.type.startsWith('video/')) {
      fileIcon = '🎥';
      messageContent = `🎥 Видео: ${file.name}`;
    } else if (file.type.startsWith('audio/')) {
      fileIcon = '🎵';
      messageContent = `🎵 Аудио: ${file.name}`;
    } else if (file.name.endsWith('.exe')) {
      fileIcon = '⚙️';
      messageContent = `⚙️ Программа: ${file.name}`;
    } else {
      messageContent = `📎 Файл: ${file.name}`;
    }
    
    const message = {
      type: 'file',
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
      isImage: file.type.startsWith('image/'),
      isVideo: file.type.startsWith('video/'),
      isExe: file.name.endsWith('.exe'),
      fileData: fileData,
      displayText: messageContent,
      fileIcon: fileIcon
    };
    
    socket.emit('sendMessage', { 
      token, 
      receiverId: selectedUser.id, 
      content: JSON.stringify(message) 
    });
    
    const timestamp = new Date().toISOString();
    window.lastMessages.set(parseInt(selectedUser.id), {
      content: messageContent,
      sender_id: currentUser.id,
      timestamp: timestamp
    });
    
    // Скрываем прогресс через 2 секунды
    setTimeout(() => {
      if (uploadStatus) uploadStatus.classList.add('hidden');
    }, 2000);
  };
  
  reader.onerror = () => {
    alert('Ошибка при чтении файла');
    if (uploadStatus) uploadStatus.classList.add('hidden');
  };
  
  reader.readAsDataURL(file);
  fileInput.value = '';
}

function downloadFile(dataUrl, fileName) {
  // Предупреждение для .exe файлов
  if (fileName.endsWith('.exe')) {
    if (!confirm('⚠️ ВНИМАНИЕ! Это исполняемый файл (.exe).\n\nУбедитесь, что вы доверяете отправителю.\n\nСкачать файл?')) {
      return;
    }
  }
  
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function openUserProfile(userId) {
  if (!userProfileModal) return;
  
  fetch(`/api/user/${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(r => r.json())
  .then(user => {
    const displayName = user.custom_username ? `@${user.custom_username}` : user.username;
    userProfileModalTitle.textContent = 'Профиль пользователя';
    userProfileModalUsername.innerHTML = getRoleDisplay(user.role, displayName);
    userProfileModalPic.src = user.profile_pic || defaultProfilePic;
    userProfileModalBio.textContent = user.bio || 'Нет информации';
    userProfileModalStars.innerHTML = `Звёзды: ${Math.min(9999, user.stars || 0)}`;
    
    const isOnline = onlineUsers.has(parseInt(user.id));
    const statusElement = document.createElement('div');
    statusElement.className = 'user-online-status';
    statusElement.innerHTML = isOnline ? 
      '<span class="online-indicator"></span> в сети' : 
      '<span class="offline-indicator"></span> не в сети';
    const usernameElement = userProfileModalUsername;
    if (usernameElement && !usernameElement.nextElementSibling?.classList.contains('user-online-status')) {
      usernameElement.insertAdjacentElement('afterend', statusElement);
    }
    
    fetch(`/api/user/${userId}/gifts`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(giftsData => {
      if (giftsCount) giftsCount.textContent = giftsData.total;
      if (giftsList) {
        giftsList.innerHTML = '';
        giftsData.gifts.forEach(gift => {
          for (let i = 0; i < gift.count; i++) {
            const img = document.createElement('img');
            img.src = getGiftGif(gift.gift_type);
            img.className = 'gift-gif';
            giftsList.appendChild(img);
          }
        });
      }
    });
    
    userProfileModal.classList.remove('hidden');
  })
  .catch(error => console.error('Error loading user profile:', error));
}

function getRoleDisplay(role, text) {
  if (role === 'creator') return `<span style="color: #ff4444; font-weight: bold;">${text}</span>`;
  if (role === 'admin') return `<span style="color: #ffaa00; font-weight: bold;">${text}</span>`;
  if (role === 'bot') return `<span style="color: #00aaff; font-weight: bold;">${text} 🤖</span>`;
  return text;
}

function getGiftGif(type) {
  return 'https://media.giphy.com/media/3o7TKz9bX9v9J9KQZ6/giphy.gif';
}

function loadWallpaper() {
  if (!selectedUser || !messagesDiv) return;
  const chatId = `chat-${Math.min(currentUser.id, selectedUser.id)}-${Math.max(currentUser.id, selectedUser.id)}`;
  const cached = localStorage.getItem(`wallpaper_${chatId}`);
  if (cached) messagesDiv.style.backgroundImage = `url(${cached})`;
}

function handleWallpaperSelect(e) {
  const file = e.target.files[0];
  if (!file || !selectedUser) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const wallpaperData = event.target.result;
    const chatId = `chat-${Math.min(currentUser.id, selectedUser.id)}-${Math.max(currentUser.id, selectedUser.id)}`;
    fetch('/api/update-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ wallpaper: wallpaperData, chatId })
    })
    .then(r => r.json())
    .then(result => {
      if (result.message) {
        localStorage.setItem(`wallpaper_${chatId}`, wallpaperData);
        loadWallpaper();
      }
    });
  };
  reader.readAsDataURL(file);
}

function showEmojiPicker() {
  const existing = document.getElementById('emojiPickerPanel');
  if (existing) { existing.remove(); return; }
  const picker = document.createElement('div');
  picker.id = 'emojiPickerPanel';
  picker.className = 'emoji-picker';
  commonEmojis.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'emoji-btn';
    btn.textContent = emoji;
    btn.onclick = () => {
      if (messageInput) {
        messageInput.value += emoji;
        messageInput.focus();
      }
      picker.remove();
    };
    picker.appendChild(btn);
  });
  document.querySelector('.message-input-container')?.appendChild(picker);
}

function handleTyping() {
  if (!selectedUser) return;
  clearTimeout(typingTimer);
  if (!isTyping) {
    isTyping = true;
    socket.emit('typing', { userId: currentUser.id, receiverId: selectedUser.id, isTyping: true });
  }
  typingTimer = setTimeout(() => {
    if (isTyping) {
      isTyping = false;
      socket.emit('typing', { userId: currentUser.id, receiverId: selectedUser.id, isTyping: false });
    }
  }, TYPING_TIMEOUT);
}

function handleMobileTyping() {
  if (!selectedUser) return;
  clearTimeout(typingTimer);
  if (!isTyping) {
    isTyping = true;
    socket.emit('typing', { userId: currentUser.id, receiverId: selectedUser.id, isTyping: true });
  }
  typingTimer = setTimeout(() => {
    if (isTyping) {
      isTyping = false;
      socket.emit('typing', { userId: currentUser.id, receiverId: selectedUser.id, isTyping: false });
    }
  }, TYPING_TIMEOUT);
}

// ============= ЗВОНКИ =============

let liveKitRoom = null;
let isAudioEnabled = true;
let isVideoEnabled = true;

async function startCall(type) {
  if (!selectedUser) return;
  try {
    const roomName = `chat-${Math.min(currentUser.id, selectedUser.id)}-${Math.max(currentUser.id, selectedUser.id)}`;
    const response = await fetch('/api/livekit-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ username: currentUser.username, roomName })
    });
    const data = await response.json();
    callModal?.classList.remove('hidden');
    if (callModalTitle) callModalTitle.textContent = type === 'video' ? 'Видеозвонок' : 'Аудиозвонок';
    liveKitRoom = new window.LiveKitClient.Room({ audio: true, video: type === 'video' });
    liveKitRoom.on(window.LiveKitClient.RoomEvent.TrackSubscribed, handleTrackSubscribed);
    liveKitRoom.on(window.LiveKitClient.RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    liveKitRoom.on(window.LiveKitClient.RoomEvent.Disconnected, endCall);
    await liveKitRoom.connect(LIVEKIT_URL, data.token);
    await liveKitRoom.localParticipant.setAudioEnabled(true);
    if (type === 'video') await liveKitRoom.localParticipant.setVideoEnabled(true);
  } catch (error) {
    console.error('Failed to start call:', error);
    alert('Ошибка при подключении к звонку');
    endCall();
  }
}

function handleTrackSubscribed(track) {
  if (!liveKitContainer) return;
  if (track.kind === 'video') {
    const video = document.createElement('video');
    video.autoplay = true;
    video.playsinline = true;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'contain';
    track.attach(video);
    liveKitContainer.innerHTML = '';
    liveKitContainer.appendChild(video);
  } else if (track.kind === 'audio') {
    const audio = document.createElement('audio');
    audio.autoplay = true;
    track.attach(audio);
  }
}

function handleTrackUnsubscribed(track) {
  track.detach();
  if (track.kind === 'video' && liveKitContainer) liveKitContainer.innerHTML = '';
}

function toggleAudio() {
  if (liveKitRoom) {
    isAudioEnabled = !isAudioEnabled;
    liveKitRoom.localParticipant.setAudioEnabled(isAudioEnabled);
    if (toggleAudioBtn) toggleAudioBtn.style.opacity = isAudioEnabled ? '1' : '0.5';
  }
}

function toggleVideo() {
  if (liveKitRoom) {
    isVideoEnabled = !isVideoEnabled;
    liveKitRoom.localParticipant.setVideoEnabled(isVideoEnabled);
    if (toggleVideoBtn) toggleVideoBtn.style.opacity = isVideoEnabled ? '1' : '0.5';
  }
}

async function endCall() {
  if (liveKitRoom) {
    await liveKitRoom.disconnect();
    liveKitRoom = null;
  }
  callModal?.classList.add('hidden');
  if (liveKitContainer) liveKitContainer.innerHTML = '';
  isAudioEnabled = isVideoEnabled = true;
  if (toggleAudioBtn) toggleAudioBtn.style.opacity = '1';
  if (toggleVideoBtn) toggleVideoBtn.style.opacity = '1';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============= SOCKET СОБЫТИЯ =============

socket.on('onlineUsers', (onlineUserIds) => {
  onlineUsers.clear();
  onlineUserIds.forEach(id => onlineUsers.add(parseInt(id)));
  if (!isMobile) loadPCChats();
  if (isMobile) loadAllChats();
});

socket.on('userOnline', (userId) => {
  onlineUsers.add(parseInt(userId));
  if (!isMobile) loadPCChats();
  if (isMobile) loadAllChats();
  if (selectedUser && selectedUser.id === parseInt(userId)) {
    if (chatHeaderStatus) chatHeaderStatus.innerHTML = '<span class="online-indicator"></span> в сети';
    if (window.mobileChatStatus) window.mobileChatStatus.innerHTML = '<span class="online-indicator"></span> в сети';
  }
});

socket.on('userOffline', (userId) => {
  onlineUsers.delete(parseInt(userId));
  if (!isMobile) loadPCChats();
  if (isMobile) loadAllChats();
  if (selectedUser && selectedUser.id === parseInt(userId)) {
    if (chatHeaderStatus) chatHeaderStatus.innerHTML = '<span class="offline-indicator"></span> не в сети';
    if (window.mobileChatStatus) window.mobileChatStatus.innerHTML = '<span class="offline-indicator"></span> не в сети';
  }
});

socket.on('userTyping', (data) => {
  if (!selectedUser || selectedUser.id !== data.userId) return;
  if (isMobile && window.mobileChatStatus) {
    window.mobileChatStatus.innerHTML = data.isTyping ? 
      '<span class="online-indicator"></span> печатает...' : 
      '<span class="online-indicator"></span> в сети';
  } else if (chatHeaderStatus) {
    chatHeaderStatus.innerHTML = data.isTyping ? 
      '<span class="online-indicator"></span> печатает...' : 
      '<span class="online-indicator"></span> в сети';
  }
});

socket.on('newMessage', (message) => {
  if (messageIds.has(message.id)) return;
  
  const otherUserId = message.sender_id === currentUser?.id ? message.receiver_id : message.sender_id;
  let displayContent = message.content;
  if (displayContent && displayContent.length > 30) displayContent = displayContent.substring(0, 27) + '...';
  
  window.lastMessages.set(parseInt(otherUserId), { 
    content: displayContent, 
    sender_id: message.sender_id,
    timestamp: message.timestamp 
  });
  
  if (currentChatType === 'user' && selectedUser && selectedUser.id === message.sender_id) {
    displayMessage(message);
    if (isMobile && window.mobileMessages) displayMobileMessage(message);
    if (messagesDiv && isUserAtBottom) messagesDiv.scrollTop = messagesDiv.scrollHeight;
    if (window.mobileMessages && isUserAtBottom) window.mobileMessages.scrollTop = window.mobileMessages.scrollHeight;
  } else if (message.receiver_id === currentUser?.id) {
    const currentUnread = unreadMessages.get(parseInt(message.sender_id)) || 0;
    unreadMessages.set(parseInt(message.sender_id), currentUnread + 1);
  }
  
  if (!isMobile) loadPCChats();
  if (isMobile) loadAllChats();
});

socket.on('newGroupMessage', (message) => {
  let displayContent = message.content;
  if (displayContent && displayContent.length > 30) displayContent = displayContent.substring(0, 27) + '...';
  window.lastGroupMessages.set(parseInt(message.group_id), {
    content: displayContent,
    sender_id: message.sender_id,
    timestamp: message.timestamp
  });
  
  if (currentChatType === 'group' && currentGroup === message.group_id) {
    displayGroupMessage(message);
    if (isMobile && window.mobileMessages) displayMobileGroupMessage(message);
    if (messagesDiv && isUserAtBottom) messagesDiv.scrollTop = messagesDiv.scrollHeight;
    if (window.mobileMessages && isUserAtBottom) window.mobileMessages.scrollTop = window.mobileMessages.scrollHeight;
  }
  
  if (isMobile) loadAllChats();
  else loadPCChats();
});

socket.on('addedToGroup', (data) => {
  alert(`✅ Вы добавлены в группу "${data.group_name}"`);
  if (isMobile) loadAllChats();
  else loadPCChats();
});

// Проверка авторизации
const storedToken = localStorage.getItem('token');
const storedUser = localStorage.getItem('user');

if (storedToken && storedUser) {
  token = storedToken;
  currentUser = JSON.parse(storedUser);
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  if (themeToggle) themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
  initApp();
} else {
  window.location.href = '/login.html';
}

// Экспортируем функции
window.createGroup = createGroup;
window.selectGroup = selectGroup;
window.selectUser = selectUser;
window.addFriend = addFriend;
window.openProfile = openProfile;
window.openUserProfile = openUserProfile;
window.toggleTheme = toggleTheme;
window.handleLogout = handleLogout;
window.sendMessage = sendMessage;
window.downloadFile = downloadFile;