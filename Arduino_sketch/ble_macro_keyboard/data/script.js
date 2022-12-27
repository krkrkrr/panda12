const KEY_SIZE_UNIT = 100

let keymap = {}
let metakey = {}

window.onload = () => {
  document
    .getElementById('nav-tabs')
    .addEventListener('click', toggleTabs, false)

  document
    .getElementById('select-key-form')
    .addEventListener('change', toggleSelect, false)

  document
    .getElementById('frame-tabs')
    .addEventListener('click', onClickKeymap, false)
  readInit()
}

function toggleTabs(event) {
  const target = event.target
  if (!target.classList.contains('tab-item')) {
    return
  }
  const activeClassName = 'is-tab-active'
  const tabsClassName = 'tab-item'
  const allTabs = document.querySelectorAll('.' + tabsClassName)
  allTabs.forEach((item) => {
    item.classList.remove(activeClassName)
  })
  target.classList.add(activeClassName)
  toggleLayer(target)
}

function toggleLayer(targetTab) {
  const layerNum = countClickElementNumber(targetTab, 'tab-item')
  const frameTabs = document.querySelectorAll('.keymap-layer')
  frameTabs.forEach((frame) => {
    frame.style.display = 'none'
  })
  frameTabs[layerNum].style.display = 'block'
}

function readInit() {
  Promise.all([readKeymap(), readMetakey()]).then(() => {
    appendKeymap()
    document.getElementById('nav-tabs').children[0].click()
    appendAllSelectKeyNum()
    document.querySelectorAll('.key-sw')[0].click()
  })
}

// Useless top level await.
async function readKeymap() {
  keymap = await (await fetch('keymap.json')).json()
}

/**
 * metakey.json を読み込み、グローバル変数の metakey へ {keyNum: displayName} の形で代入
 */
async function readMetakey() {
  metakey = Object.fromEntries(
    Object.entries(await (await fetch('metakey.json')).json()).map((entry) => [
      entry[1],
      entry[0],
    ])
  )
}

function appendKeymap() {
  const navTabs = document.getElementById('nav-tabs')
  const frameTabs = document.getElementById('frame-tabs')
  const maxBottom = Math.max(
    ...keymap.layout[keymap.layout.length - 1].map((lastItem) =>
      Math.round(KEY_SIZE_UNIT * (lastItem.top + lastItem.height) * 1.2)
    )
  )
  frameTabs.style.height = maxBottom + 'px'

  removeChildAll(navTabs)
  removeChildAll(frameTabs)
  keymap.assign.forEach((assignLayer, layerIdx) => {
    navTabs.appendChild(createTabLayerElement(layerIdx))
    frameTabs.appendChild(createKeymapLayerElement(keymap.layout, assignLayer))
  })
}

function createKeymapLayerElement(layout, assigns) {
  const frameDiv = document.createElement('div')
  frameDiv.classList.add('keymap-layer')
  const keyDivs = layout.map((row) =>
    row.map((item) => {
      const div = document.createElement('div')
      div.classList.add('key-sw')
      div.style.top = Math.round(KEY_SIZE_UNIT * 1.2 * item.top) + 'px'
      div.style.left = Math.round(KEY_SIZE_UNIT * 1.2 * item.left) + 'px'
      div.style.width = Math.round(KEY_SIZE_UNIT * item.width) + 'px'
      div.style.height = Math.round(KEY_SIZE_UNIT * item.height) + 'px'
      div.style.inlineSize = Math.round(KEY_SIZE_UNIT * item.width) + 'px'
      return div
    })
  )
  keyDivs.forEach((row, i) =>
    row.forEach((keyDiv, j) => {
      if (i in assigns && j in assigns[i]) {
        if (assigns[i][j].num >= 0) {
          const keyNum = assigns[i][j].num
          const div = document.createElement('div')
          div.textContent = toDisplayName(keyNum)
          keyDiv.appendChild(div)
        } else {
          const text = assigns[i][j].text
          const div = document.createElement('div')
          div.textContent = text.length >= 24 ? text.slice(0, 23) + '...' : text
          keyDiv.appendChild(div)
        }
      }
      frameDiv.appendChild(keyDiv)
    })
  )
  return frameDiv
}

function createTabLayerElement(idx) {
  const div = document.createElement('div')
  div.textContent = 'Layer ' + idx
  div.classList.add('tab-item')
  return div
}

/**
 * key-num メニューの選択肢を追加する
 */
function appendAllSelectKeyNum() {
  const select = document.getElementById('select-key-num')
  const createOption = (value, text) => {
    const option = document.createElement('option')
    option.value = value
    option.textContent = text
    return option
  }
  for (let i = 33; i <= 126; i++) {
    select.appendChild(createOption(i, String.fromCharCode(i)))
  }
  for (const [i, value] of Object.entries(metakey)) {
    select.appendChild(createOption(i, value))
  }
}

function removeChildAll(elem) {
  while (elem.firstChild) {
    elem.removeChild(elem.firstChild)
  }
}

/**
 * Keyboard.press() で使用できる文字コードから理解できる文字列に変換
 * @param {int} num - asciiの非制御文字(32-126)とmetakey.json内の非asciiキー
 * @return {string} - 理解できる文字列
 */
function toDisplayName(num) {
  if (33 <= num && num <= 126) {
    return String.fromCharCode(num)
  } else if (num in metakey) {
    return metakey[num]
  } else {
    throw new RangeError('Not available for key input: ' + num)
  }
}

/**
 * select メニューの value に対応する id の要素を表示・非表示にする。
 * @param {Event} event - select に設定した change イベント
 */
function toggleSelect(event) {
  const selectedId = event.target.value
  const select = event.target
  const optionAll = select.querySelectorAll('option')
  for (const option of optionAll) {
    const id = option.value
    if (id == selectedId) {
      document.getElementById(id).parentElement.style.removeProperty('display')
    } else {
      document.getElementById(id).parentElement.style.display = 'none'
    }
  }
}

/**
 * key-form から値を取得
 * @return {[iny, int, int, string]} - [layer-index, key-index, num, text]
 */
function getKeyFormValue() {
  const form = document.getElementById('key-form')
  const selectedId = document.getElementById('select-key-form').value
  if (selectedId == 'select-key-num') {
    return [
      form['layer-index'],
      form['key-index'],
      Number(document.getElementById(selectedId).value),
      '',
    ]
  } else {
    return [
      form['layer-index'],
      form['key-index'],
      -1,
      document.getElementById(selectedId).value,
    ]
  }
}

/**
 * 同じ深さの要素の中で何番目か取得する
 * @param {Element} target - body 以上の HTML Element
 * @param {string} className -
 * @returns {int} - 0始まりのindex
 */
function countClickElementNumber(target, className) {
  const parent = target.parentElement
  return [...parent.querySelectorAll('.' + className)].findIndex(
    (elem) => elem == target
  )
}

/**
 * 何番目のtabがactiveか取得する
 * @returns {int} - 0始まりのindex
 */
function countLayerNumber() {
  return [...document.querySelectorAll('.tab-item')].findIndex((elem) =>
    elem.classList.contains('is-tab-active')
  )
}

function toggleFormValue(event) {
  const clickTarget = event.target
  event.stopPropagation()
}

function onClickKeymap(event) {
  const getKeySwDiv = (target) => {
    let elem = target
    while (elem) {
      if (elem.classList.contains('key-sw')) {
        return elem
      }
      elem = elem.parentElement
    }
    return null
  }
  const keySwDiv = getKeySwDiv(event.target)
  if (keySwDiv) {
    const setFormValue = (layerIndex, keyIndex) => {
      const form = document.getElementById('key-form')
      form['layer-index'].value = layerIndex
      form['key-index'].value = keyIndex
      const keySw = keymap.assign[layerIndex][0][keyIndex]
      console.log('layerIndex', layerIndex)
      console.log('keyIndex', keyIndex)
      console.log('keySw', keySw)
      if (keySw.num >= 0) {
        form['select-key-form'].value = 'select-key-num'
        form['select-key-form'].dispatchEvent(new Event('change'))
        form['key-num'].value = keySw.num
        form['key-text'].value = ''
      } else {
        form['select-key-form'].value = 'input-key-text'
        form['select-key-form'].dispatchEvent(new Event('change'))
        form['key-num'].value = -1
        form['key-text'].value = keySw.text
      }
    }
    setFormValue(
      countLayerNumber(),
      countClickElementNumber(keySwDiv, 'key-sw')
    )
  }
}