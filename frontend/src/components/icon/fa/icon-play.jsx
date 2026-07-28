import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay } from '@fortawesome/free-solid-svg-icons';

const IconPlay = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faPlay} className={className} {...props} />;
};

export default IconPlay;
