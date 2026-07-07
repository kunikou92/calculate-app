const toggleButton = document.getElementById('symbolToggle');
const symbolMenu = document.getElementById('symbolMenu');
const expressionDisplay = document.querySelector('.expression');
const resultDisplay = document.querySelector('.result');
const popupStack = document.getElementById('popupStack');
const popupTrack = document.getElementById('popupTrack');
const popupThumb = document.getElementById('popupThumb');

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

function getOperatorPrecedence(operator) {
  if (operator === '+' || operator === '-') {
    return 1;
  }

  if (operator === '*' || operator === '/') {
    return 2;
  }

  return 0;
}

function applyOperator(values, operators, operator) {
  const right = values.pop();
  const left = values.pop();

  if (left === undefined || right === undefined) {
    throw new Error('Invalid expression');
  }

  switch (operator) {
    case '+':
      values.push(left + right);
      break;
    case '-':
      values.push(left - right);
      break;
    case '*':
      values.push(left * right);
      break;
    case '/':
      if (right === 0) {
        throw new Error('Division by zero');
      }
      values.push(left / right);
      break;
    default:
      throw new Error('Unsupported operator');
  }
}

function evaluateExpression(expression) {
  if (!expression || isIncompleteExpression(expression)) {
    return null;
  }

  const sanitizedExpression = sanitizeExpression(expression);
  const values = [];
  const operators = [];
  let numberBuffer = '';

  try {
    const tokens = sanitizedExpression.match(/\d+(?:\.\d+)?|[()+\-*/]/g) || [];

    for (const token of tokens) {
      if (/^\d+(?:\.\d+)?$/.test(token)) {
        values.push(Number(token));
        continue;
      }

      if (token === '(') {
        operators.push(token);
        continue;
      }

      if (token === ')') {
        while (operators.length && operators[operators.length - 1] !== '(') {
          const operator = operators.pop();
          applyOperator(values, operators, operator);
        }

        if (operators.pop() !== '(') {
          throw new Error('Mismatched parentheses');
        }
        continue;
      }

      if (['+', '-', '*', '/'].includes(token)) {
        while (
          operators.length &&
          operators[operators.length - 1] !== '(' &&
          getOperatorPrecedence(operators[operators.length - 1]) >= getOperatorPrecedence(token)
        ) {
          const operator = operators.pop();
          applyOperator(values, operators, operator);
        }

        operators.push(token);
      }
    }

    while (operators.length) {
      const operator = operators.pop();
      if (operator === '(') {
        throw new Error('Mismatched parentheses');
      }
      applyOperator(values, operators, operator);
    }

    const result = values[0];
    return Number.isFinite(result) ? result : null;
  } catch (error) {
    return null;
  }
}

function hideCenterDisplay() {
  expressionDisplay.textContent = '0';
  resultDisplay.textContent = '0';
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

    const expressionLine = document.createElement('div');
    expressionLine.className = 'popup-line';
    expressionLine.textContent = expressionValue;

    const resultLine = document.createElement('div');
    resultLine.className = 'popup-line';
    resultLine.textContent = `= ${resultValue}`;

    popupItem.appendChild(expressionLine);
    popupItem.appendChild(resultLine);
  } else {
    popupItem.classList.add('single-line');
    popupItem.textContent = `${expressionValue} = ${resultValue}`;
  }

  popupStack.appendChild(popupItem);
  requestAnimationFrame(updatePopupScrollIndicator);
}

function updateDisplay() {
  expressionDisplay.textContent = currentExpression || '0';

  if (!currentExpression) {
    resultDisplay.textContent = '0';
    return;
  }

  const result = evaluateExpression(currentExpression);
  resultDisplay.textContent = result === null ? '0' : String(result);
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
}

popupStack?.addEventListener('scroll', updatePopupScrollIndicator);

window.addEventListener('resize', updatePopupScrollIndicator);

document.querySelector('.buttons')?.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button || button.id === 'symbolToggle' || button.closest('.symbol-menu')) {
    return;
  }

  const value = button.textContent.trim();
  appendValue(value);
});

updateDisplay();
