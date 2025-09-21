import { fcitxReady } from 'fcitx5-js'

export default defineBackground(() => {
  if (!browser.input) {
    return
  }
  let engineID = ''
  let contextID = 0
  const { ime } = browser.input

  fcitxReady.then(() => {
    // @ts-expect-error ChromeOS specific API for C++.
    globalThis.fcitx.chrome = {
      setCandidates(arg: string) {
        if (!engineID || contextID < 0) {
          return
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
          ime.setCandidateWindowProperties({
            engineID,
            properties: { visible: false },
          })
        }
      },
    }

    globalThis.fcitx.commit = (text: string) => {
      ime.commitText({ contextID, text })
    }

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
      if (!handled && keyData.ctrlKey && !keyData.altKey && !keyData.shiftKey && keyData.key === ' ') {
        // Hack Ctrl+Space to avoid Unchecked runtime.lastError: [input.ime.keyEventHandled]: The engine is not active.
        return false
      }
      ime.keyEventHandled(requestId, handled)
      return true
    })
  })

  ime.onActivate.addListener((engine) => {
    engineID = engine
  })

  ime.onDeactivated.addListener(() => {
    engineID = ''
  })

  ime.onFocus.addListener((context) => {
    contextID = context.contextID
  })

  ime.onBlur.addListener(() => {
    contextID = -1
  })

  ime.onCandidateClicked.addListener((_, candidateID) => {
    globalThis.fcitx.Module.ccall('select_candidate', 'void', ['number'], [candidateID])
  })
})
