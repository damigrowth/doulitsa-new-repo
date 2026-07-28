import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faThumbsUp } from '@fortawesome/free-solid-svg-icons';

const IconThumbsUp = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faThumbsUp} className={className} {...props} />;
};

export default IconThumbsUp;
