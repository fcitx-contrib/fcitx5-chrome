export default defineBackground(() => {
  if (!browser.input) {
    return
  }
  let contextID = 0
  const { ime } = browser.input

  ime.onFocus.addListener((context) => {
    contextID = context.contextID
  })

  ime.onBlur.addListener(() => {
    contextID = -1
  })

  ime.onKeyEvent.addListener((engineID, keyData, requestId) => {
    if (keyData.type !== 'keydown') {
      return false
    }

    if (/^[a-z]$/i.test(keyData.key)) {
      ime.setComposition({
        contextID,
        text: '',
        cursor: 0,
      })

      const candidates = [
        { candidate: 'foo', id: 0, label: '1' },
        { candidate: 'bar', id: 1, label: '2' },
      ]
      ime.setCandidates({
        contextID,
        candidates,
      })
      ime.setCandidateWindowProperties({
        engineID,
        properties: {
          visible: true,
          cursorVisible: true,
          vertical: true,
          pageSize: candidates.length,
        },
      })
      ime.keyEventHandled(requestId, true)
      return true
    }

    ime.keyEventHandled(requestId, false)
    return false
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
