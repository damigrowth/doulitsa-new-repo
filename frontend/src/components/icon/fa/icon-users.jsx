import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers } from '@fortawesome/free-solid-svg-icons';

const IconUsers = ({ className, size, color }) => {
  return (
    <FontAwesomeIcon
      icon={faUsers}
      className={className}
      size={size}
      color={color}
    />
  );
};

export default IconUsers;
