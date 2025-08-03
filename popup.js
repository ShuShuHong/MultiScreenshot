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
  // 下一题按钮选择器 - 元素捕获功能
  document.getElementById('nextButtonArrow').addEventListener('click', () => startElementCapture('nextButton'));

  // 终止元素选择器 - 元素捕获功能
  document.getElementById('endElementArrow').addEventListener('click', () => startElementCapture('endElement'));
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

  // 打开浏览器下载设置按钮
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'chrome://settings/downloads' });
    });
  }

  // 帮助对话框功能
  const helpBtn = document.getElementById('helpBtn');

  if (helpBtn) {
    // 点击问号按钮打开新窗口显示帮助图片
    helpBtn.addEventListener('click', () => {
      // 获取当前扩展的根目录路径
      const extensionUrl = chrome.runtime.getURL('downloadHelp.html');
      // 打开新窗口显示帮助页面
      chrome.windows.create({
        url: extensionUrl,
        type: 'popup',
        width: 800,
        height: 600,
        left: Math.floor((screen.width - 800) / 2),
        top: Math.floor((screen.height - 600) / 2)
      });
    });
  }

  // 添加输入框变化事件监听
  document.getElementById('loopCount').addEventListener('change', saveSettings);
  document.getElementById('loopUntilEnd').addEventListener('change', saveSettings);
  document.getElementById('nextButtonSelector').addEventListener('change', saveSettings);
  document.getElementById('endElementSelector').addEventListener('change', saveSettings);

  // 添加消息监听器，接收CSS选择器和错误消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'setSelector') {
    const selectorType = request.selectorType || 'nextButton';
    const inputElement = document.getElementById(selectorType === 'endElement' ? 'endElementSelector' : 'nextButtonSelector');
    if (inputElement) {
      inputElement.value = request.selector;
      saveSettings(); // 保存新的选择器
      console.log(`已更新${selectorType}选择器:`, request.selector);
    }
  } else if (request.action === 'nextButtonNotFound') {
    // 显示错误消息
    alert(request.message);
    console.error('错误:', request.message);
  }
});
});

// 开始元素捕获
function startElementCapture(selectorType = 'nextButton') {
  console.log('开始捕获', selectorType);
  
  // 不隐藏popup页面，以便接收消息
  // window.close();
  
  // 获取当前活动标签页
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    
    // 在标签页中注入捕获脚本
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (selectorType) => {
        // 创建浮层 - 半透明灰色背景，防止用户误操作
        const overlay = document.createElement('div');
        overlay.id = 'element-capture-overlay';
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.3);
          pointer-events: none;
          z-index: 9999;
        `;
        document.body.appendChild(overlay);
        
        // 创建顶层交互层 - 用于捕获点击事件
        const interactionLayer = document.createElement('div');
        interactionLayer.id = 'element-capture-interaction';
        interactionLayer.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: transparent;
          pointer-events: auto;
          z-index: 10001;
          cursor: crosshair;
        `;
        document.body.appendChild(interactionLayer);
        
        // 创建高亮元素
        const highlighter = document.createElement('div');
        highlighter.id = 'element-highlighter';
        highlighter.style.cssText = `
          position: fixed;
          border: 2px solid red;
          background-color: rgba(255, 0, 0, 0.2);
          pointer-events: none;
          z-index: 10000;
          display: none;
        `;
        document.body.appendChild(highlighter);
        
        // 鼠标移动事件处理
        document.addEventListener('mousemove', (e) => {
          // 忽略交互层，获取下方的元素
          interactionLayer.style.pointerEvents = 'none';
          const element = document.elementFromPoint(e.clientX, e.clientY);
          interactionLayer.style.pointerEvents = 'auto';
          
          if (element && element !== overlay && element !== highlighter) {
            const rect = element.getBoundingClientRect();
            highlighter.style.left = `${rect.left}px`;
            highlighter.style.top = `${rect.top}px`;
            highlighter.style.width = `${rect.width}px`;
            highlighter.style.height = `${rect.height}px`;
            highlighter.style.display = 'block';
          } else {
            highlighter.style.display = 'none';
          }
        });
        
        // 生成CSS选择器函数
        function generateCSSSelector(element) {
          if (!element || !element.tagName) return '';
          
          // 基础选择器：标签名
          let selector = element.tagName.toLowerCase();
          
          // 添加ID选择器
          if (element.id) {
            selector += `#${element.id}`;
            return selector;
          }
          
          // 添加类选择器
          if (element.classList.length) {
            const classes = Array.from(element.classList).join('.');
            selector += `.${classes}`;
          }
          
          // 添加data-v属性选择器（Vue组件常用）
          const dataVAttrs = Array.from(element.attributes)
            .filter(attr => attr.name.startsWith('data-v-'))
            .map(attr => `[${attr.name}]`)
            .join('');
          selector += dataVAttrs;
          
          // 如果选择器不够唯一，添加父元素信息
          if (document.querySelectorAll(selector).length > 1 && element.parentElement) {
            const parentSelector = generateCSSSelector(element.parentElement);
            if (parentSelector) {
              selector = `${parentSelector} > ${selector}`;
            }
          }
          
          return selector;
        }

        // 鼠标点击事件处理
        interactionLayer.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // 临时禁用交互层，获取点击位置的元素
          interactionLayer.style.pointerEvents = 'none';
          const element = document.elementFromPoint(e.clientX, e.clientY);
          interactionLayer.style.pointerEvents = 'auto';
          
          if (element && element !== overlay && element !== highlighter) {
            // 打印元素代码到控制台
            console.log('捕获到元素:', element);
            console.log('元素HTML:', element.outerHTML);
            
            // 生成并打印CSS选择器
            const cssSelector = generateCSSSelector(element);
            console.log('CSS选择器:', cssSelector);

            // 将CSS选择器发送到popup页面
            chrome.runtime.sendMessage({
              action: 'setSelector',
              selector: cssSelector,
              selectorType: selectorType
            });
            
            // 移除浮层、交互层和高亮元素
            document.body.removeChild(overlay);
            document.body.removeChild(interactionLayer);
            document.body.removeChild(highlighter);
          }
        }, { once: true });
      },
      args: [selectorType]  // 传递选择器类型参数
    });
  });
}

// 点击下一题按钮
function clickNextButton(tab, nextButtonSelector, callback) {
  // 执行脚本点击目标元素
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (selector) => {
      try {
        // 查找目标元素
        const nextButton = document.querySelector(selector);
        if (nextButton) {
          nextButton.click();
          console.log('已点击下一题按钮');
          return true;
        } else {
          console.error('未找到下一题按钮');
          // 发送未找到按钮的消息
          chrome.runtime.sendMessage({
            action: 'nextButtonNotFound',
            message: '下一页的按钮未找到，可能已经截取完毕，或者元素代码有误，请检查。'
          });
          return false;
        }
      } catch (error) {
        console.error('选择器无效:', error);
        // 发送选择器无效的消息
        chrome.runtime.sendMessage({
          action: 'nextButtonNotFound',
          message: '下一页的按钮未找到，可能已经截取完毕，或者元素代码有误，请检查。'
        });
        return false;
      }
    },
    args: [nextButtonSelector]
  }, (results) => {
    if (chrome.runtime.lastError) {
      console.error('执行脚本失败:', chrome.runtime.lastError);
      return;
    }

    // 检查脚本执行结果
    const success = results && results[0] && results[0].result;
    if (success) {
      // 成功找到并点击按钮，等待2秒后执行回调
      setTimeout(() => {
        if (typeof callback === 'function') {
          callback();
        }
      }, 2000);
    }
    // 如果失败，不执行回调，避免继续循环
  });
}