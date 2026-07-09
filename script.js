const elements = {
  toggleButton: document.getElementById('symbolToggle'),
  symbolMenu: document.getElementById('symbolMenu'),
  expressionDisplay: document.querySelector('.expression'),
  resultDisplay: document.querySelector('.result'),
  popupStack: document.getElementById('popupStack'),
  popupTrack: document.getElementById('popupTrack'),
  popupThumb: document.getElementById('popupThumb'),
  historyClearButton: document.getElementById('historyClear'),
  calculatorButtons: document.querySelector('.buttons'),
};

const state = {
  expression: '',
  isCalculationCompleted: false,
};

const operators = new Set(['+', '-', '*', '/', '^']);

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

  const lastCharacter = trimmed.at(-1);
  if (operators.has(lastCharacter)) {
    return true;
  }

  const openingParentheses = (trimmed.match(/\(/g) ?? []).length;
  const closingParentheses = (trimmed.match(/\)/g) ?? []).length;

  return openingParentheses > closingParentheses;
}

function tokenizeExpression(expression) {
  const tokens = [];

  for (let index = 0; index < expression.length; ) {
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

    if (operators.has(character)) {
      tokens.push(character);
      index += 1;
      continue;
    }

    if (character === '!') {
      tokens.push('!');
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

    const peek = () => tokens[index];

    const consume = (expected) => {
      const token = tokens[index];
      if (expected && token !== expected) {
        throw new Error('Unexpected token');
      }
      index += 1;
      return token;
    };

    const parseExpression = () => {
      let value = parseTerm();

      while (peek() === '+' || peek() === '-') {
        const operator = consume();
        const right = parseTerm();
        value = operator === '+' ? value + right : value - right;
      }

      return value;
    };

    const parseTerm = () => {
      let value = parsePower();

      while (peek() === '*' || peek() === '/') {
        const operator = consume();
        const right = parsePower();
        value = operator === '*' ? value * right : value / right;
      }

      return value;
    };

    const parsePower = () => {
      let value = parseUnary();

      if (peek() === '^') {
        consume('^');
        const exponent = parsePower();
        value = Math.pow(value, exponent);
      }

      return value;
    };

    const applyFactorial = (value) => {
      while (peek() === '!') {
        consume('!');

        if (!Number.isInteger(value) || value < 0) {
          throw new Error('Factorial requires a non-negative integer');
        }

        let factorial = 1;
        for (let currentIndex = 2; currentIndex <= value; currentIndex += 1) {
          factorial *= currentIndex;
        }

        value = factorial;
      }

      return value;
    };

    const parsePostfix = () => {
      const value = parsePrimary();
      return applyFactorial(value);
    };

    const parseUnary = () => {
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
        return applyFactorial(Math.sqrt(parseUnary()));
      }

      if (token === 'sin') {
        consume();
        return applyFactorial(Math.sin(parseUnary()));
      }

      if (token === 'cos') {
        consume();
        return applyFactorial(Math.cos(parseUnary()));
      }

      if (token === 'tan') {
        consume();
        return applyFactorial(Math.tan(parseUnary()));
      }

      if (token === 'π') {
        consume();
        return applyFactorial(Math.PI);
      }

      return parsePostfix();
    };

    const parsePrimary = () => {
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
    };

    const result = parseExpression();

    if (index !== tokens.length) {
      throw new Error('Unexpected trailing token');
    }

    return Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

function renderDisplay() {
  if (!elements.expressionDisplay || !elements.resultDisplay) {
    return;
  }

  elements.expressionDisplay.textContent = state.expression || '0';
  elements.resultDisplay.textContent = getLiveResult(state.expression);
}

function hideCenterDisplay() {
  elements.expressionDisplay.textContent = '0';
  elements.resultDisplay.textContent = '0';
}

function updateHistoryClearButton() {
  if (!elements.historyClearButton || !elements.popupStack) {
    return;
  }

  const hasHistory = elements.popupStack.children.length > 0;
  elements.historyClearButton.classList.toggle('visible', hasHistory);
}

function updatePopupScrollIndicator() {
  if (!elements.popupStack || !elements.popupTrack || !elements.popupThumb) {
    return;
  }

  const shouldShowTrack = elements.popupStack.children.length > 8;
  elements.popupTrack.classList.toggle('visible', shouldShowTrack);

  if (!shouldShowTrack) {
    return;
  }

  const scrollTop = elements.popupStack.scrollTop;
  const scrollHeight = elements.popupStack.scrollHeight - elements.popupStack.clientHeight;
  const trackHeight = elements.popupTrack.clientHeight;
  const thumbHeight = Math.max(40, (elements.popupStack.clientHeight / elements.popupStack.scrollHeight) * trackHeight);

  if (scrollHeight <= 0) {
    elements.popupThumb.style.top = '0px';
    elements.popupThumb.style.height = `${thumbHeight}px`;
    return;
  }

  const top = (scrollTop / scrollHeight) * (trackHeight - thumbHeight);
  elements.popupThumb.style.top = `${top}px`;
  elements.popupThumb.style.height = `${thumbHeight}px`;
}

function addHistoryEntry(expressionValue, resultValue) {
  if (!elements.popupStack) {
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
  Object.assign(measurement.style, {
    position: 'absolute',
    left: '-9999px',
    top: '-9999px',
    visibility: 'hidden',
    maxWidth: 'none',
    width: 'auto',
  });
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
  elements.popupStack.appendChild(popupItem);
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

  if (!expressionForEvaluation || isIncompleteExpression(expressionForEvaluation)) {
    return '0';
  }

  const result = evaluateExpression(expressionForEvaluation);
  return result === null ? '0' : String(result);
}

function appendDecimal() {
  if (state.isCalculationCompleted) {
    state.expression = '';
    state.isCalculationCompleted = false;
  }

  if (!state.expression || /[+\-*/^]/.test(state.expression.slice(-1)) || state.expression.endsWith('(')) {
    state.expression += '0.';
    renderDisplay();
    return;
  }

  const lastToken = state.expression.split(/([+\-*/^()])/g).filter(Boolean).at(-1) ?? '';
  if (!lastToken || lastToken.includes('.')) {
    return;
  }

  state.expression += '.';
  renderDisplay();
}

function appendValue(value) {
  if (value === 'C') {
    state.expression = '';
    state.isCalculationCompleted = false;
    hideCenterDisplay();
    return;
  }

  if (value === '.') {
    appendDecimal();
    return;
  }

  if (value === '=') {
    const result = evaluateExpression(state.expression);
    const displayValue = result === null ? '0' : String(result);
    const expressionValue = state.expression || '0';

    state.isCalculationCompleted = true;
    addHistoryEntry(expressionValue, displayValue);
    renderDisplay();
    return;
  }

  if (state.isCalculationCompleted) {
    state.expression = '';
    state.isCalculationCompleted = false;
    hideCenterDisplay();
  }

  state.expression += value;
  renderDisplay();
}

function bindEvents() {
  if (elements.toggleButton && elements.symbolMenu) {
    elements.toggleButton.addEventListener('click', () => {
      const isOpen = elements.symbolMenu.classList.toggle('open');
      elements.symbolMenu.setAttribute('aria-hidden', String(!isOpen));
    });

    elements.symbolMenu.querySelectorAll('.menu-btn').forEach((button) => {
      button.addEventListener('click', () => {
        appendValue(button.textContent.trim());
      });
    });
  }

  elements.popupStack?.addEventListener('scroll', updatePopupScrollIndicator);

  elements.historyClearButton?.addEventListener('click', () => {
    elements.popupStack.replaceChildren();
    updateHistoryClearButton();
    updatePopupScrollIndicator();
  });

  window.addEventListener('resize', updatePopupScrollIndicator);

  elements.calculatorButtons?.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || button.id === 'symbolToggle') {
      return;
    }

    appendValue(button.textContent.trim());
  });
}

function init() {
  bindEvents();
  renderDisplay();
}

document.addEventListener('DOMContentLoaded', init);
