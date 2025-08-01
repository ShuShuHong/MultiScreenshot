// 添加选择器测试按钮事件监听器
// 保存设置到本地存储
function saveSettings() {
  const settings = {
    loopCount: document.getElementById('loopCount').value,
    loopUntilEnd: document.getElementById('loopUntilEnd').checked,
    nextButtonSelector: document.getElementById('nextButtonSelector').value,
    endElementSelector: document.getElementById('endElementSelector').value
  };
  localStorage.setItem('gaoyaShicaoSettings', JSON.stringify(settings));
}

// 从本地存储加载设置
function loadSettings() {
  const settingsJson = localStorage.getItem('gaoyaShicaoSettings');
  if (settingsJson) {
    try {
      const settings = JSON.parse(settingsJson);
      if (settings.loopCount) document.getElementById('loopCount').value = settings.loopCount;
      if (settings.loopUntilEnd !== undefined) document.getElementById('loopUntilEnd').checked = settings.loopUntilEnd;
      if (settings.nextButtonSelector) document.getElementById('nextButtonSelector').value = settings.nextButtonSelector;
      if (settings.endElementSelector) document.getElementById('endElementSelector').value = settings.endElementSelector;
    } catch (e) {
      console.error('加载设置失败:', e);
    }
  }
}

function setupSelectorTestButtons() {
  // 下一题按钮选择器测试
  document.getElementById('nextButtonSearch').addEventListener('click', () => {
    const selector = document.getElementById('nextButtonSelector').value;
    testSelector(selector, '下一题按钮');
  });

  // 终止元素选择器测试
  document.getElementById('endElementSearch').addEventListener('click', () => {
    const selector = document.getElementById('endElementSelector').value;
    testSelector(selector, '终止元素');
  });

  // 箭头按钮暂时无功能
}

// 测试选择器函数
function testSelector(selector, elementName) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (sel) => {
        const element = document.querySelector(sel);
        if (element) {
          // 高亮元素
          const originalStyle = element.style.cssText;
          element.style.cssText = 'border: 2px solid red; background-color: rgba(255, 0, 0, 0.2);';
          // 2秒后恢复样式
          setTimeout(() => {
            element.style.cssText = originalStyle;
          }, 2000);
          return true;
        }
        return false;
      },
      args: [selector]
    }, (results) => {
      if (chrome.runtime.lastError) {
        console.error('测试选择器时出错:', chrome.runtime.lastError);
        alert(`测试${elementName}选择器时出错: ${chrome.runtime.lastError.message}`);
        return;
      }

      if (results && results[0] && results[0].result) {
        alert(`成功找到${elementName}!`);
      } else {
        alert(`未找到${elementName}，请检查选择器是否正确。`);
      }
    });
  });
}

document.getElementById('screenshotBtn').addEventListener('click', () => {
  // 获取循环次数、复选框状态和选择器
  const loopCountInput = document.getElementById('loopCount');
  const loopCount = parseInt(loopCountInput.value) || 2;
  const loopUntilEndCheckbox = document.getElementById('loopUntilEnd');
  const loopUntilEnd = loopUntilEndCheckbox.checked;
  const nextButtonSelector = document.getElementById('nextButtonSelector').value;
  const endElementSelector = document.getElementById('endElementSelector').value;

  // 获取当前活动标签页
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];

    // 开始循环截图
    startLoopScreenshot(tab, loopCount, loopUntilEnd, nextButtonSelector, endElementSelector);
  });
});

// 检测是否存在终止元素
// 检测是否存在终止元素
function checkIfEnd(tab, endElementSelector, callback) {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (selector) => {
      // 查找终止元素
      const endElement = document.querySelector(selector);
      return endElement !== null;
    },
    args: [endElementSelector]
  }, (results) => {
    if (chrome.runtime.lastError) {
      console.error('执行脚本失败:', chrome.runtime.lastError);
      callback(false);
      return;
    }

    // 结果在results[0].result中
    callback(results[0].result);
  });
}

// 开始循环截图
function startLoopScreenshot(tab, loopCount, loopUntilEnd, nextButtonSelector, endElementSelector) {
  // 初始化索引
  let currentIndex = 1;

  // 执行第一轮截图
  takeScreenshot(tab, currentIndex);

  // 定义循环函数
  function continueLoop() {
    currentIndex++;

    if (loopUntilEnd) {
      // 循环到终止模式：先检测是否终止
      checkIfEnd(tab, endElementSelector, (isEnd) => {
        if (!isEnd) {
          // 没有终止，执行翻页
          clickNextButton(tab, nextButtonSelector, () => {
            // 翻页后等待2秒再截图
            setTimeout(() => {
              takeScreenshot(tab, currentIndex);
              continueLoop();
            }, 2000);
          });
        } else {
          console.log('已检测到终止元素，停止循环');
        }
      });
    } else if (currentIndex <= loopCount) {
      // 按次数循环模式：翻页
      clickNextButton(tab, nextButtonSelector, () => {
        // 翻页后等待2秒再截图
        setTimeout(() => {
          takeScreenshot(tab, currentIndex);
          continueLoop();
        }, 2000);
      });
    }
  }

  // 第一轮截图完成后，启动循环
  setTimeout(continueLoop, 1000);
}

// 截图函数
// 截图函数
function takeScreenshot(tab, index) {
  chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }, (dataUrl) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      alert('截图失败: ' + chrome.runtime.lastError.message);
      return;
    }

    // 获取标签页标题
    const title = tab.title || 'untitled';
    // 截取标题前10个字符
    // 只替换文件名中不允许的特殊字符
    const shortTitle = title.substring(0, 10).replace(/[\/:*?"<>|]/g, '_');
    // 生成时间戳
    const timestamp = new Date().getTime();

    // 处理截图并下载
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const link = document.createElement('a');
      // 新的文件名格式: 标题前10字符_截图序号_时间戳.png
      link.download = `${shortTitle}_${index}_${timestamp}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.src = dataUrl;
  });
}

// 页面加载完成后初始化选择器测试按钮
// 为输入框添加变化事件监听器
document.addEventListener('DOMContentLoaded', () => {
  setupSelectorTestButtons();
  loadSettings(); // 加载保存的设置

  // 添加输入框变化事件监听
  document.getElementById('loopCount').addEventListener('change', saveSettings);
  document.getElementById('loopUntilEnd').addEventListener('change', saveSettings);
  document.getElementById('nextButtonSelector').addEventListener('change', saveSettings);
  document.getElementById('endElementSelector').addEventListener('change', saveSettings);
});

// 点击下一题按钮
function clickNextButton(tab, nextButtonSelector, callback) {
  // 执行脚本点击目标元素
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (selector) => {
      // 查找目标元素
      const nextButton = document.querySelector(selector);
      if (nextButton) {
        nextButton.click();
        console.log('已点击下一题按钮');
      } else {
        console.error('未找到下一题按钮');
      }
    },
    args: [nextButtonSelector]
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('执行脚本失败:', chrome.runtime.lastError);
      return;
    }

    // 等待2秒后执行回调
    setTimeout(() => {
      if (typeof callback === 'function') {
        callback();
      }
    }, 2000);
  });
}