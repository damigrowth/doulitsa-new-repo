import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';

const IconPaperPlane = ({ className = '', ...props }) => {
  return (
    <FontAwesomeIcon icon={faPaperPlane} className={className} {...props} />
  );
};

export default IconPaperPlane;
