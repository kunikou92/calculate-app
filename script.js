const toggleButton = document.getElementById('symbolToggle');
const symbolMenu = document.getElementById('symbolMenu');
const expressionDisplay = document.querySelector('.expression');
const resultDisplay = document.querySelector('.result');
const popupStack = document.getElementById('popupStack');
const popupTrack = document.getElementById('popupTrack');
const popupThumb = document.getElementById('popupThumb');
const historyClearButton = document.getElementById('historyClear');

let currentExpression = '';
let isCalculationCompleted = false;

function sanitizeExpression(expression) {
  return expression
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/（/g, '(')
    .replace(/）/g, ')');
}

function isIncompleteExpression(expression) {
  const trimmed = expression.trim();

  if (!trimmed) {
    return true;
  }

  const lastCharacter = trimmed[trimmed.length - 1];
  const operators = ['+', '-', '*', '/', '^'];

  if (operators.includes(lastCharacter)) {
    return true;
  }

  const openingParentheses = (trimmed.match(/\(/g) || []).length;
  const closingParentheses = (trimmed.match(/\)/g) || []).length;

  return openingParentheses > closingParentheses;
}

function tokenizeExpression(expression) {
  const tokens = [];
  let index = 0;

  while (index < expression.length) {
    const character = expression[index];

    if (/\s/.test(character)) {
      index += 1;
      continue;
    }

    if (/\d|\./.test(character)) {
      let numberBuffer = character;
      index += 1;

      while (index < expression.length && /\d|\./.test(expression[index])) {
        numberBuffer += expression[index];
        index += 1;
      }

      tokens.push(numberBuffer);
      continue;
    }

    if (character === '(' || character === ')') {
      tokens.push(character);
      index += 1;
      continue;
    }

    if (['+', '-', '*', '/', '^'].includes(character)) {
      tokens.push(character);
      index += 1;
      continue;
    }

    if (expression.startsWith('sqrt', index)) {
      tokens.push('sqrt');
      index += 4;
      continue;
    }

    if (expression.startsWith('sin', index)) {
      tokens.push('sin');
      index += 3;
      continue;
    }

    if (expression.startsWith('cos', index)) {
      tokens.push('cos');
      index += 3;
      continue;
    }

    if (expression.startsWith('tan', index)) {
      tokens.push('tan');
      index += 3;
      continue;
    }

    if (expression.startsWith('π', index)) {
      tokens.push('π');
      index += 1;
      continue;
    }

    if (expression.startsWith('√', index)) {
      tokens.push('√');
      index += 1;
      continue;
    }

    throw new Error('Unsupported token');
  }

  return tokens;
}

function evaluateExpression(expression) {
  if (!expression || isIncompleteExpression(expression)) {
    return null;
  }

  const sanitizedExpression = sanitizeExpression(expression);

  try {
    const tokens = tokenizeExpression(sanitizedExpression);
    let index = 0;

    function peek() {
      return tokens[index];
    }

    function consume(expected) {
      const token = tokens[index];
      if (expected && token !== expected) {
        throw new Error('Unexpected token');
      }
      index += 1;
      return token;
    }

    function parseExpression() {
      let value = parseTerm();

      while (peek() === '+' || peek() === '-') {
        const operator = consume();
        const right = parseTerm();
        value = operator === '+' ? value + right : value - right;
      }

      return value;
    }

    function parseTerm() {
      let value = parsePower();

      while (peek() === '*' || peek() === '/') {
        const operator = consume();
        const right = parsePower();
        value = operator === '*' ? value * right : value / right;
      }

      return value;
    }

    function parsePower() {
      let value = parseUnary();

      if (peek() === '^') {
        consume('^');
        const exponent = parsePower();
        value = Math.pow(value, exponent);
      }

      return value;
    }

    function parseUnary() {
      const token = peek();

      if (token === '+') {
        consume('+');
        return parseUnary();
      }

      if (token === '-') {
        consume('-');
        return -parseUnary();
      }

      if (token === '√' || token === 'sqrt') {
        consume();
        return Math.sqrt(parseUnary());
      }

      if (token === 'sin') {
        consume();
        return Math.sin(parseUnary());
      }

      if (token === 'cos') {
        consume();
        return Math.cos(parseUnary());
      }

      if (token === 'tan') {
        consume();
        return Math.tan(parseUnary());
      }

      if (token === 'π') {
        consume();
        return Math.PI;
      }

      return parsePrimary();
    }

    function parsePrimary() {
      const token = peek();

      if (token === '(') {
        consume('(');
        const value = parseExpression();
        consume(')');
        return value;
      }

      if (token && /^\d+(?:\.\d+)?$/.test(token)) {
        return Number(consume());
      }

      throw new Error('Unexpected token');
    }

    const result = parseExpression();
    if (index !== tokens.length) {
      throw new Error('Unexpected trailing token');
    }

    return Number.isFinite(result) ? result : null;
  } catch (error) {
    return null;
  }
}

function hideCenterDisplay() {
  expressionDisplay.textContent = '0';
  resultDisplay.textContent = '0';
}

function updateHistoryClearButton() {
  if (!historyClearButton || !popupStack) {
    return;
  }

  const hasHistory = popupStack.children.length > 0;
  historyClearButton.classList.toggle('visible', hasHistory);
}

function updatePopupScrollIndicator() {
  if (!popupStack || !popupTrack || !popupThumb) {
    return;
  }

  const shouldShowTrack = popupStack.children.length > 8;
  popupTrack.classList.toggle('visible', shouldShowTrack);

  if (!shouldShowTrack) {
    return;
  }

  const scrollTop = popupStack.scrollTop;
  const scrollHeight = popupStack.scrollHeight - popupStack.clientHeight;
  const trackHeight = popupTrack.clientHeight;
  const thumbHeight = Math.max(40, (popupStack.clientHeight / popupStack.scrollHeight) * trackHeight);

  if (scrollHeight <= 0) {
    popupThumb.style.top = '0px';
    popupThumb.style.height = `${thumbHeight}px`;
    return;
  }

  const top = (scrollTop / scrollHeight) * (trackHeight - thumbHeight);
  popupThumb.style.top = `${top}px`;
  popupThumb.style.height = `${thumbHeight}px`;
}

function showExpressionPopup(expressionValue, resultValue) {
  if (!popupStack) {
    return;
  }

  const popupItem = document.createElement('div');
  popupItem.className = 'expression-popup';
  popupItem.dataset.expression = expressionValue;
  popupItem.dataset.result = resultValue;

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'popup-delete';
  deleteButton.setAttribute('aria-label', '履歴を削除');
  deleteButton.textContent = '×';
  deleteButton.addEventListener('click', () => {
    popupItem.remove();
    updateHistoryClearButton();
    updatePopupScrollIndicator();
  });

  popupItem.appendChild(deleteButton);

  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'popup-content';

  const measurement = document.createElement('div');
  measurement.className = 'expression-popup single-line';
  measurement.style.position = 'absolute';
  measurement.style.left = '-9999px';
  measurement.style.top = '-9999px';
  measurement.style.visibility = 'hidden';
  measurement.style.maxWidth = 'none';
  measurement.style.width = 'auto';
  measurement.textContent = `${expressionValue} = ${resultValue}`;
  document.body.appendChild(measurement);

  const shouldWrap = measurement.getBoundingClientRect().width > 220;
  measurement.remove();

  if (shouldWrap) {
    popupItem.classList.add('multi-line');
    contentWrapper.classList.add('multi-line');

    const expressionLine = document.createElement('div');
    expressionLine.className = 'popup-line';
    expressionLine.textContent = expressionValue;

    const resultLine = document.createElement('div');
    resultLine.className = 'popup-line';
    resultLine.textContent = `= ${resultValue}`;

    contentWrapper.appendChild(expressionLine);
    contentWrapper.appendChild(resultLine);
  } else {
    popupItem.classList.add('single-line');
    contentWrapper.classList.add('single-line');
    contentWrapper.textContent = `${expressionValue} = ${resultValue}`;
  }

  popupItem.appendChild(contentWrapper);
  popupStack.appendChild(popupItem);
  updateHistoryClearButton();
  requestAnimationFrame(updatePopupScrollIndicator);
}

function getLiveResult(expression) {
  if (!expression) {
    return '0';
  }

  const trimmedExpression = expression.trim();
  const normalizedExpression = sanitizeExpression(trimmedExpression);
  const trailingOperatorMatch = normalizedExpression.match(/([+\-*/^])$/);
  const expressionForEvaluation = trailingOperatorMatch ? normalizedExpression.slice(0, -1) : normalizedExpression;

  if (!expressionForEvaluation) {
    return '0';
  }

  if (isIncompleteExpression(expressionForEvaluation)) {
    return '0';
  }

  const result = evaluateExpression(expressionForEvaluation);
  return result === null ? '0' : String(result);
}

function updateDisplay() {
  expressionDisplay.textContent = currentExpression || '0';
  resultDisplay.textContent = getLiveResult(currentExpression);
}

function appendDecimal() {
  if (isCalculationCompleted) {
    currentExpression = '';
    isCalculationCompleted = false;
  }

  if (!currentExpression || /[+\-*/^]/.test(currentExpression.slice(-1)) || currentExpression.endsWith('(')) {
    currentExpression += '0.';
    updateDisplay();
    return;
  }

  const lastToken = currentExpression.split(/([+\-*/^()])/g).filter(Boolean).pop() || '';
  if (!lastToken || lastToken.includes('.')) {
    return;
  }

  currentExpression += '.';
  updateDisplay();
}

function appendValue(value) {
  if (value === 'C') {
    currentExpression = '';
    isCalculationCompleted = false;
    hideCenterDisplay();
    return;
  }

  if (value === '.') {
    appendDecimal();
    return;
  }

  if (value === '=') {
    const result = evaluateExpression(currentExpression);
    const displayValue = result === null ? '0' : String(result);
    const expressionValue = currentExpression || '0';

    isCalculationCompleted = true;
    showExpressionPopup(expressionValue, displayValue);
    return;
  }

  if (isCalculationCompleted) {
    currentExpression = '';
    isCalculationCompleted = false;
    hideCenterDisplay();
  }

  currentExpression += value;
  updateDisplay();
}

if (toggleButton && symbolMenu) {
  toggleButton.addEventListener('click', () => {
    const isOpen = symbolMenu.classList.toggle('open');
    symbolMenu.setAttribute('aria-hidden', String(!isOpen));
  });

  symbolMenu.querySelectorAll('.menu-btn').forEach((button) => {
    button.addEventListener('click', () => {
      appendValue(button.textContent.trim());
    });
  });
}

popupStack?.addEventListener('scroll', updatePopupScrollIndicator);

historyClearButton?.addEventListener('click', () => {
  popupStack.innerHTML = '';
  updateHistoryClearButton();
  updatePopupScrollIndicator();
});

window.addEventListener('resize', updatePopupScrollIndicator);

document.querySelector('.buttons')?.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button || button.id === 'symbolToggle') {
    return;
  }

  const value = button.textContent.trim();
  appendValue(value);
});

updateDisplay();
