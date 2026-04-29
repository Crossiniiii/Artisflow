import { supabase } from '../supabase';
import { mapToSnakeCase } from '../utils/supabaseUtils';
import { UserAccount } from '../types';

export const useChatOperations = () => {
  const handleSendMessage = async (conversationId: string, text: string, currentUser: UserAccount) => {
    if (!text.trim() || !currentUser) return;

    try {
      const newMessage = {
        conversationId: conversationId,
        senderId: currentUser.id,
        senderName: currentUser.name || currentUser.fullName || 'Unknown',
        text,
        timestamp: new Date().toISOString(),
        readBy: [currentUser.id]
      };

      const { error: msgError } = await supabase
        .from('messages')
        .insert(mapToSnakeCase(newMessage))
        .select()
        .single();

      if (msgError) throw msgError;

      // Update conversation's last message and unread counts
      // We need to fetch the conversation first to know participants
      const { data: conv, error: convFetchError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();
      
      if (!convFetchError && conv) {
        const unreadCount = { ...(conv.unread_count || {}) };
        
        conv.participant_ids.forEach((pid: string) => {
          if (pid !== currentUser.id) {
            unreadCount[pid] = (unreadCount[pid] || 0) + 1;
          }
        });

        const { error: convUpdateError } = await supabase
          .from('conversations')
          .update(mapToSnakeCase({
            lastMessage: {
              text,
              senderName: currentUser.name || currentUser.fullName || 'Unknown',
              timestamp: newMessage.timestamp
            },
            updatedAt: newMessage.timestamp,
            unreadCount: unreadCount
          }))
          .eq('id', conversationId);
        
        if (convUpdateError) throw convUpdateError;
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleStartConversation = async (participantIds: string[], participantNames: { [key: string]: string }) => {
    try {
      const newConversation = {
        participantIds: participantIds,
        participantNames: participantNames,
        updatedAt: new Date().toISOString(),
        unreadCount: participantIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {})
      };

      const { data, error } = await supabase
        .from('conversations')
        .insert(mapToSnakeCase(newConversation))
        .select()
        .single();
        
      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error starting conversation:', error);
      return null;
    }
  };

  const handleMarkRead = async (conversationId: string, currentUser: UserAccount) => {
    if (!currentUser) return;

    try {
        // Fetch current unread count to reset only current user's
        const { data: conv } = await supabase.from('conversations').select('unread_count').eq('id', conversationId).single();
        if (conv) {
            const newUnread = { ...conv.unread_count, [currentUser.id]: 0 };
            await supabase.from('conversations').update(mapToSnakeCase({ unreadCount: newUnread })).eq('id', conversationId);
        }
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      // Supabase CASCADE delete should handle messages if foreign keys are set up,
      // but manually deleting is safer if unsure.
      await supabase.from('messages').delete().eq('conversation_id', conversationId);
      await supabase.from('conversations').delete().eq('id', conversationId);
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  return {
    handleSendMessage,
    handleStartConversation,
    handleMarkRead,
    handleDeleteConversation
  };
};
