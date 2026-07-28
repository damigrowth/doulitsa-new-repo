import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';

const IconTrash = ({ className, size, color }) => {
  return (
    <FontAwesomeIcon
      icon={faTrash}
      className={className}
      size={size}
      color={color}
    />
  );
};

export default IconTrash;
