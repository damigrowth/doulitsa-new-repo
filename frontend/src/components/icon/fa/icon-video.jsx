import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVideo } from '@fortawesome/free-solid-svg-icons';

const IconVideo = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faVideo} className={className} {...props} />;
};

export default IconVideo;
