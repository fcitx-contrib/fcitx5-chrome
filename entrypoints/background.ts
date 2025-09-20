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
        const { candidates, highlighted } = JSON.parse(arg) as {
          candidates: {
            text: string
            label: string
            comment: string
          }[]
          highlighted: number
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
      ime.keyEventHandled(requestId, keyEvent({
        ...keyData,
        getModifierState: (modifier: string) => {
          if (modifier === 'CapsLock') {
            return !!keyData.capsLock
          }
          return false
        },
        preventDefault: () => {},
      }))
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

  ime.onCandidateClicked.addListener((engineID, candidateID) => {
    ime.commitText({ contextID, text: candidateID.toString() })
    ime.setCandidates({
      contextID,
      candidates: [],
    })
    ime.setCandidateWindowProperties({ engineID, properties: { visible: false } })
  })
})
