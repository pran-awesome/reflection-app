const JOINED_KEY = 'reflection_joined';
const NAME_KEY = 'reflection_participant_name';
const ANSWERED_KEY_PREFIX = 'reflection_answered_';

export function getJoinedFlag() {
  return localStorage.getItem(JOINED_KEY) === '1';
}

export function setJoinedFlag() {
  localStorage.setItem(JOINED_KEY, '1');
}

export function getStoredName() {
  return localStorage.getItem(NAME_KEY) || '';
}

export function setStoredName(name) {
  localStorage.setItem(NAME_KEY, name);
}

export function markAnsweredLocally(pageId) {
  localStorage.setItem(ANSWERED_KEY_PREFIX + pageId, '1');
}

export function hasAnsweredLocally(pageId) {
  return localStorage.getItem(ANSWERED_KEY_PREFIX + pageId) === '1';
}
