export interface Mention {
  username: string;
  startIndex: number;
  endIndex: number;
}

export function extractMentions(text: string): Mention[] {
  const mentions: Mention[] = [];
  const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push({
      username: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length
    });
  }
  
  return mentions;
}

export function renderTextWithMentions(text: string, mentions: Mention[]): string {
  if (mentions.length === 0) return text;
  
  let result = '';
  let lastIndex = 0;
  
  // Sort mentions by start index to process them in order
  const sortedMentions = [...mentions].sort((a, b) => a.startIndex - b.startIndex);
  
  for (const mention of sortedMentions) {
    // Add text before the mention
    result += text.slice(lastIndex, mention.startIndex);
    
    // Add the mention with styling
    result += `<span class="mention" data-username="${mention.username}">@${mention.username}</span>`;
    
    lastIndex = mention.endIndex;
  }
  
  // Add remaining text after the last mention
  result += text.slice(lastIndex);
  
  return result;
}

export function getUsersFromMentions(mentions: Mention[], availableUsers: { id: string; name: string }[]): { id: string; name: string }[] {
  const mentionedUsers: { id: string; name: string }[] = [];
  
  for (const mention of mentions) {
    // Try to find user by exact name match (case-insensitive)
    const user = availableUsers.find(u => 
      u.name.toLowerCase() === mention.username.toLowerCase()
    );
    
    if (user && !mentionedUsers.find(mu => mu.id === user.id)) {
      mentionedUsers.push(user);
    }
  }
  
  return mentionedUsers;
}

export function createMentionSuggestions(
  currentText: string,
  cursorPosition: number,
  availableUsers: { id: string; name: string }[]
): { suggestions: { id: string; name: string }[]; mentionStart: number } | null {
  // Find if cursor is after an @ symbol
  const beforeCursor = currentText.slice(0, cursorPosition);
  const mentionMatch = beforeCursor.match(/@([a-zA-Z0-9_.-]*)$/);
  
  if (!mentionMatch) {
    return null;
  }
  
  const mentionStart = cursorPosition - mentionMatch[0].length;
  const searchTerm = mentionMatch[1].toLowerCase();
  
  // Filter users based on search term
  const suggestions = availableUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm)
  ).slice(0, 5); // Limit to 5 suggestions
  
  return {
    suggestions,
    mentionStart
  };
}

export function insertMention(
  currentText: string,
  cursorPosition: number,
  mentionStart: number,
  username: string
): { newText: string; newCursorPosition: number } {
  const beforeMention = currentText.slice(0, mentionStart);
  const afterCursor = currentText.slice(cursorPosition);
  const mentionText = `@${username} `;
  
  const newText = beforeMention + mentionText + afterCursor;
  const newCursorPosition = mentionStart + mentionText.length;
  
  return {
    newText,
    newCursorPosition
  };
}