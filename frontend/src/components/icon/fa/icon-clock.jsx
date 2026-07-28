import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock } from '@fortawesome/free-solid-svg-icons';

const IconClock = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faClock} className={className} {...props} />;
};

export default IconClock;
