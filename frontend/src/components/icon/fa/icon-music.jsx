import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMusic } from '@fortawesome/free-solid-svg-icons';

const IconMusic = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faMusic} className={className} {...props} />;
};

export default IconMusic;
