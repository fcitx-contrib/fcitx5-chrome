import type { FCITX } from 'fcitx5-js'
import { fcitxReady } from 'fcitx5-js'

const IM_PREFIX = 'im:'
const SA_PREFIX = 'sa:'
const OPTIONS = 'options'

export default defineBackground(() => {
  if (!browser.input) {
    return
  }
  let engineID = ''
  let contextID = 0
  let currentInputMethod = ''
  let inputMethods: { name: string, displayName: string }[] = []
  let menuActions: ReturnType<FCITX['getMenuActions']> = []
  const { ime } = browser.input

  function hideCandidateWindow() {
    ime.setCandidateWindowProperties({
      engineID,
      properties: { visible: false },
    })
  }

  function setMenuItems() {
    if (!engineID) {
      return
    }
    ime.setMenuItems({ engineID, items: [...inputMethods.map(inputMethod => ({
      id: `${IM_PREFIX}${inputMethod.name}`,
      label: inputMethod.displayName,
      checked: inputMethod.name === currentInputMethod,
    })), ...menuActions.flatMap(menuAction => (menuAction.separator
      ? []
      : [{
          id: `${SA_PREFIX}${menuAction.id}`,
          label: menuAction.desc,
          checked: menuAction.checked,
        }, ...(menuAction.children ?? []).flatMap(action => (action.separator
          ? []
          : [{
              id: `${SA_PREFIX}${action.id}`,
              label: `　　${action.desc}`, // eslint-disable-line no-irregular-whitespace
              checked: action.checked,
            }]))])), {
      id: OPTIONS,
      label: browser.i18n.getMessage('settings'),
    }] })
  }

  fcitxReady.then(() => {
    // @ts-expect-error ChromeOS specific API for C++.
    globalThis.fcitx.chrome = {
      setCandidates(arg: string) {
        if (!engineID) {
          return
        }
        if (contextID < 0) { // onBlur
          return hideCandidateWindow()
        }
        const { candidates, highlighted, preedit, caret, auxUp } = JSON.parse(arg) as {
          candidates: {
            text: string
            label: string
            comment: string
          }[]
          highlighted: number
          preedit: string
          caret: number
          auxUp: string
        }
        const index = globalThis.fcitx.utf8Index2JS(preedit, caret)
        let aux = preedit ? `${preedit.slice(0, index)}‸${preedit.slice(index)}` : ''
        if (auxUp) {
          aux = `${auxUp} ${aux}`
        }
        ime.setCandidates({
          contextID,
          candidates: candidates.map((candidate, i) => ({
            id: i,
            candidate: candidate.text,
            label: candidate.label,
            annotation: candidate.comment,
          })),
        })
        if (highlighted >= 0) {
          ime.setCursorPosition({
            contextID,
            candidateID: highlighted,
          })
        }
        if (candidates.length > 0) {
          ime.setCandidateWindowProperties({
            engineID,
            properties: {
              visible: true,
              cursorVisible: true,
              vertical: true,
              pageSize: candidates.length,
              auxiliaryText: aux,
              auxiliaryTextVisible: !!aux,
            },
          })
        }
        else if (aux) {
          ime.setCandidateWindowProperties({
            engineID,
            properties: {
              visible: true,
              vertical: false,
              pageSize: 1,
              auxiliaryText: `   ${aux}`, // ChromeOS shows padding right unconditionally.
              auxiliaryTextVisible: true,
            },
          })
        }
        else {
          hideCandidateWindow()
        }
      },
    }

    globalThis.fcitx.setPreedit = (text: string, caret: number) => {
      if (contextID < 0) {
        return
      }
      ime.setComposition({ contextID, text, cursor: globalThis.fcitx.utf8Index2JS(text, caret) })
    }

    globalThis.fcitx.commit = (text: string) => {
      if (contextID < 0) {
        return
      }
      ime.commitText({ contextID, text })
    }

    globalThis.fcitx.setInputMethodsCallback(() => {
      inputMethods = globalThis.fcitx.getInputMethods()
      currentInputMethod = globalThis.fcitx.currentInputMethod()
      setMenuItems()
    })

    globalThis.fcitx.setStatusAreaCallback(() => {
      menuActions = globalThis.fcitx.getMenuActions()
      setMenuItems()
    })

    ime.onFocus.addListener((context) => {
      contextID = context.contextID
      globalThis.fcitx.Module.ccall('focus_in', 'void', ['bool'], [false])
    })

    ime.onBlur.addListener(() => {
      // By then the old context is already blurred and disallow committing anything.
      contextID = -1
      globalThis.fcitx.Module.ccall('focus_out', 'void', [], [])
    })

    const { keyEvent } = globalThis.fcitx.enable()!
    ime.onKeyEvent.addListener((_, keyData, requestId) => {
      const handled = keyEvent({
        ...keyData,
        getModifierState: (modifier: string) => {
          if (modifier === 'CapsLock') {
            return !!keyData.capsLock
          }
          return false
        },
        preventDefault: () => {},
      })
      if (!handled && keyData.ctrlKey && !keyData.altKey && keyData.key === ' ') {
        // Hack Ctrl+(Shift+)Space to avoid Unchecked runtime.lastError: [input.ime.keyEventHandled]: The engine is not active.
        return false
      }
      ime.keyEventHandled(requestId, handled)
      return true
    })
  })

  ime.onActivate.addListener((engine) => {
    engineID = engine
    setMenuItems()
  })

  ime.onDeactivated.addListener(() => {
    engineID = ''
  })

  ime.onCandidateClicked.addListener((_, candidateID) => {
    globalThis.fcitx.Module.ccall('select_candidate', 'void', ['number'], [candidateID])
  })

  ime.onMenuItemActivated.addListener((_, name) => {
    if (name.startsWith(IM_PREFIX)) {
      const im = name.slice(IM_PREFIX.length)
      globalThis.fcitx.setCurrentInputMethod(im)
    }
    else if (name.startsWith(SA_PREFIX)) {
      const id = Number(name.slice(SA_PREFIX.length))
      globalThis.fcitx.activateMenuAction(id)
    }
    else if (name === OPTIONS) {
      browser.tabs.create({
        url: browser.runtime.getURL('/options.html'),
      })
    }
  })
})
