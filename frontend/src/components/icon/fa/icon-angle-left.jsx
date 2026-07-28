import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleLeft } from '@fortawesome/free-solid-svg-icons';

const IconAngleLeft = ({ className = '', ...props }) => {
  return (
    <FontAwesomeIcon icon={faAngleLeft} className={className} {...props} />
  );
};

export default IconAngleLeft;
