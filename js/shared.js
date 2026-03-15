// CodeQuest 共享脚本

// 初始化 Lucide 图标
document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
});

// 加载题目数据
async function loadQuestions() {
  try {
    const response = await fetch('content/questions.json');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('加载题目失败:', error);
    return null;
  }
}

// 保存进度到 localStorage
function saveProgress(questionId, isCorrect) {
  const progress = JSON.parse(localStorage.getItem('codequest_progress') || '{}');
  progress[questionId] = {
    completed: isCorrect,
    timestamp: Date.now()
  };
  localStorage.setItem('codequest_progress', JSON.stringify(progress));
}

// 获取进度
function getProgress() {
  return JSON.parse(localStorage.getItem('codequest_progress') || '{}');
}

// 计算总 XP
function calculateTotalXP() {
  const progress = getProgress();
  return Object.values(progress).filter(p => p.completed).length * 10;
}
