import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faThumbsDown } from '@fortawesome/free-solid-svg-icons';

const IconThumbsDown = ({ className = '', ...props }) => {
  return (
    <FontAwesomeIcon icon={faThumbsDown} className={className} {...props} />
  );
};

export default IconThumbsDown;
