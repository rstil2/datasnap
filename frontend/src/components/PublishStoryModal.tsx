import { useState } from 'react';
import { X, Globe, Lock, User, Tag as TagIcon, AlertCircle } from 'lucide-react';
import { ExportableStory } from '../types';
import { hybridStoryStorage } from '../services/hybridStoryStorage';
import { useUser } from '../contexts/UserContext';
import { FirebaseSignInModal } from './FirebaseSignInModal';

interface PublishStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  story: ExportableStory;
}

export default function PublishStoryModal({ isOpen, onClose, story }: PublishStoryModalProps) {
  const { user, isAuthenticated } = useUser();
  const [isPublic, setIsPublic] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);

  if (!isOpen) return null;

  const suggestedTags = [
    'data-analysis',
    'statistics',
    'visualization',
    'insights',
    'business',
    'research',
    'trends',
    'correlation',
    'patterns'
  ];

  const handleAddTag = (tag: string) => {
    if (tag.trim() && !tags.includes(tag.trim()) && tags.length < 5) {
      setTags([...tags, tag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      handleAddTag(newTag);
    }
  };

  const handlePublish = async () => {
    // Check if user is authenticated
    if (!isAuthenticated || !user) {
      setShowSignInModal(true);
      return;
    }

    setIsPublishing(true);
    
    try {
      // Save story with publication settings using hybrid Firebase storage
      await hybridStoryStorage.publishStory(story, user, isPublic, tags);
      
      setPublishSuccess(true);
      
      setTimeout(() => {
        onClose();
        // Reset form
        setPublishSuccess(false);
        setTags([]);
        setNewTag('');
      }, 2000);
      
    } catch (error) {
      console.error('Failed to publish story:', error);
    } finally {
      setIsPublishing(false);
    }
  };

  if (publishSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-md w-full mx-4">
          <div className="p-6 text-center">
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-lg)' }}>🎉</div>
            <h2 className="text-xl font-semibold mb-md">Story Published!</h2>
            <p className="text-gray-600">
              Your data story has been {isPublic ? 'published to the community' : 'saved privately'}. 
              {isPublic && ' Others can now discover and learn from your analysis.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="publish-modal-title">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 id="publish-modal-title" className="text-xl font-semibold">Publish Your Data Story</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Story Preview */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">📊</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">{story.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {story.summary}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>{story.key_insights.length} insights</span>
                  <span>{story.recommendations.length} recommendations</span>
                  <span>Quality: {story.metadata.data_quality_score.toFixed(1)}/100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Author Info */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <User size={16} className="inline mr-2" />
              Author Information
            </label>
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-xl">{user.avatar}</div>
                <div>
                  <div className="font-medium text-green-900">{user.name}</div>
                  <div className="text-sm text-green-700">Story will be published under your account</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertCircle size={20} className="text-orange-600" />
                <div>
                  <div className="font-medium text-orange-900">Sign in required</div>
                  <div className="text-sm text-orange-700">
                    You need to sign in to publish stories to the community
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Visibility Settings */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Story Visibility
            </label>
            <div className="space-y-3">
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="visibility"
                  checked={isPublic}
                  onChange={() => setIsPublic(true)}
                  className="mr-3"
                />
                <Globe size={20} className="mr-3 text-green-600" />
                <div>
                  <div className="font-medium">Public</div>
                  <div className="text-sm text-gray-600">
                    Visible in community feed and shareable via URL
                  </div>
                </div>
              </label>
              
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="visibility"
                  checked={!isPublic}
                  onChange={() => setIsPublic(false)}
                  className="mr-3"
                />
                <Lock size={20} className="mr-3 text-gray-600" />
                <div>
                  <div className="font-medium">Private</div>
                  <div className="text-sm text-gray-600">
                    Only you can access this story
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Tags */}
          {isPublic && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <TagIcon size={16} className="inline mr-2" />
                Tags ({tags.length}/5)
              </label>
              
              {/* Selected Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-blue-900"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              {/* Add Tag Input */}
              <div className="relative">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add tags to help others discover your story..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={tags.length >= 5}
                />
                {newTag.trim() && tags.length < 5 && (
                  <button
                    onClick={() => handleAddTag(newTag)}
                    className="absolute right-2 top-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Add
                  </button>
                )}
              </div>
              
              {/* Suggested Tags */}
              <div className="mt-3">
                <p className="text-xs text-gray-600 mb-2">Suggested tags:</p>
                <div className="flex flex-wrap gap-1">
                  {suggestedTags
                    .filter(tag => !tags.includes(tag))
                    .slice(0, 6)
                    .map(tag => (
                      <button
                        key={tag}
                        onClick={() => handleAddTag(tag)}
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                        disabled={tags.length >= 5}
                      >
                        {tag}
                      </button>
                    ))
                  }
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {isPublic ? (
                <>
                  <Globe size={14} className="inline mr-1" />
                  This story will be visible to everyone
                </>
              ) : (
                <>
                  <Lock size={14} className="inline mr-1" />
                  This story will be private
                </>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={isPublishing}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isPublishing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Publishing...
                  </>
                ) : (
                  <>
                    {isPublic ? 'Publish to Community' : 'Save Privately'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sign In Modal */}
      <FirebaseSignInModal 
        isOpen={showSignInModal} 
        onClose={() => setShowSignInModal(false)} 
      />
    </div>
  );
}
