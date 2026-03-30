import React from 'react';
import { generateInitials, getAvatarUrl } from '../../utils/helpers';

const Avatar = ({ user, size = 'md', showOnline = false, className = '' }) => {
  const sizes = {
    xs: 'w-7 h-7 text-[10px]',
    sm: 'w-9 h-9 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
    '2xl': 'w-28 h-28 text-2xl',
  };

  const dotSizes = {
    xs: 'w-2 h-2 border',
    sm: 'w-2.5 h-2.5 border',
    md: 'w-3 h-3 border-2',
    lg: 'w-3.5 h-3.5 border-2',
    xl: 'w-4 h-4 border-2',
    '2xl': 'w-5 h-5 border-2',
  };

  const avatarUrl = user?.avatar ? getAvatarUrl(user.avatar) : null;

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={user?.username}
          className={`${sizes[size]} avatar`}
          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
        />
      ) : null}
      <div
        className={`${sizes[size]} rounded-full flex items-center justify-center font-bold
          bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex-shrink-0
          ${avatarUrl ? 'hidden' : 'flex'}`}
      >
        {generateInitials(user?.username || user?.name || '?')}
      </div>
      {showOnline && (
        <span
          className={`absolute bottom-0 right-0 ${dotSizes[size]} rounded-full border-[var(--sidebar)]
            ${user?.isOnline ? 'bg-green-500' : 'bg-gray-500'}`}
        />
      )}
    </div>
  );
};

export default Avatar;
