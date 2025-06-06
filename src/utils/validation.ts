interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export function validateStoryData(data: unknown): ValidationResult {
  const errors: string[] = []
  const dataObj = data as Record<string, unknown>

  // 必須フィールドのチェック
  const requiredFields = ['persons', 'locations', 'acts']
  for (const field of requiredFields) {
    if (!dataObj[field] || !Array.isArray(dataObj[field])) {
      errors.push(`${field}は必須フィールドで、配列である必要があります`)
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  // Personsの検証
  const persons = dataObj.persons as Array<Record<string, unknown>>
  if (persons && persons.length === 0) {
    errors.push('少なくとも1人の登場人物が必要です')
  } else if (persons) {
    persons.forEach((person, index: number) => {
      if (!person.id || !person.name) {
        errors.push(`persons[${index}]: idとnameは必須です`)
      }
    })
  }

  // Locationsの検証
  const locations = dataObj.locations as Array<Record<string, unknown>>
  if (locations && locations.length === 0) {
    errors.push('少なくとも1つの場所が必要です')
  } else if (locations) {
    locations.forEach((location, index: number) => {
      if (!location.id || !location.name) {
        errors.push(`locations[${index}]: idとnameは必須です`)
      }
    })
  }

  // Initial Statesの検証
  const initialStates = dataObj.initialStates as Array<Record<string, unknown>>
  if (initialStates && Array.isArray(initialStates)) {
    const personIds = new Set(persons?.map((p) => p.id) || [])
    const locationIds = new Set(locations?.map((l) => l.id) || [])

    initialStates.forEach((state, index: number) => {
      if (!personIds.has(state.personId)) {
        errors.push(`initialStates[${index}]: 存在しないpersonId: ${state.personId}`)
      }
      if (!locationIds.has(state.locationId)) {
        errors.push(`initialStates[${index}]: 存在しないlocationId: ${state.locationId}`)
      }
    })
  }

  // Actsの検証
  const acts = dataObj.acts as Array<Record<string, unknown>>
  const props = dataObj.props as Array<Record<string, unknown>> | undefined
  const informations = dataObj.informations as Array<Record<string, unknown>> | undefined
  
  const personIds = new Set(persons?.map((p) => p.id) || [])
  const locationIds = new Set(locations?.map((l) => l.id) || [])
  const propIds = new Set(props?.map((p) => p.id) || [])
  const infoIds = new Set(informations?.map((i) => i.id) || [])

  acts?.forEach((act, index: number) => {
    if (!act.id || !act.personId || !act.locationId || !act.time || !act.description) {
      errors.push(`acts[${index}]: id, personId, locationId, time, descriptionは必須です`)
    }
    if (!personIds.has(act.personId)) {
      errors.push(`acts[${index}]: 存在しないpersonId: ${act.personId}`)
    }
    if (!locationIds.has(act.locationId)) {
      errors.push(`acts[${index}]: 存在しないlocationId: ${act.locationId}`)
    }
    if (act.propId && !propIds.has(act.propId)) {
      errors.push(`acts[${index}]: 存在しないpropId: ${act.propId}`)
    }
    if (act.informationId && !infoIds.has(act.informationId)) {
      errors.push(`acts[${index}]: 存在しないinformationId: ${act.informationId}`)
    }
    if (act.interactedPersonId && !personIds.has(act.interactedPersonId)) {
      errors.push(`acts[${index}]: 存在しないinteractedPersonId: ${act.interactedPersonId}`)
    }
  })

  // Eventsの検証（eventsフィールドがある場合のみ）
  const events = dataObj.events as Array<Record<string, unknown>> | undefined
  if (events && Array.isArray(events)) {
    const actIds = new Set(acts?.map((a) => a.id) || [])

    events.forEach((event, index: number) => {
      if (!event.id || !event.triggerType || !event.triggerValue || !event.eventTime || !event.personId || !event.actId) {
        errors.push(`events[${index}]: すべてのフィールドは必須です`)
      }
      if (!personIds.has(event.personId)) {
        errors.push(`events[${index}]: 存在しないpersonId: ${event.personId}`)
      }
      if (!actIds.has(event.actId)) {
        errors.push(`events[${index}]: 存在しないactId: ${event.actId}`)
      }
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}