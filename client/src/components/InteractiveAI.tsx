import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Send, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './InteractiveAI.css';

const prompts = [
  'Build me a gaming PC under ৳80,000',
  'I need an RTX 5060 workstation under ৳1,50,000.',
  'What motherboard supports Ryzen 7 7700?',
];

export default function InteractiveAI() {
  const navigate = useNavigate();
  const [currentPrompt, setCurrentPrompt] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    if (isTyping) {
      if (typedText.length < prompts[currentPrompt].length) {
        timeout = setTimeout(() => {
          setTypedText(prompts[currentPrompt].slice(0, typedText.length + 1));
        }, 50);
      } else {
        timeout = setTimeout(() => setIsTyping(false), 2000);
      }
    } else {
      if (typedText.length > 0) {
        timeout = setTimeout(() => {
          setTypedText(typedText.slice(0, -1));
        }, 30);
      } else {
        setCurrentPrompt((prev) => (prev + 1) % prompts.length);
        setIsTyping(true);
      }
    }

    return () => clearTimeout(timeout);
  }, [typedText, isTyping, currentPrompt]);

  return (
    <section className="section ai-section" id="ai">
      <div className="container ai-container">
        <motion.div
          className="ai-text"
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="ai-badge">
            <Sparkles size={14} />
            <span>TONIMA AI</span>
          </div>
          <h2 className="section-title">
            Your Personal <br />
            <span className="gradient-text">PC Architect</span>
          </h2>
          <p className="section-subtitle">
            Not sure where to start? Just tell Tonima AI what you want to do, and it will generate
            the perfect build for your budget and needs.
          </p>
          <button
            className="button-primary hero-btn"
            style={{ marginTop: '2rem' }}
            onClick={() => navigate('/ai-assistant')}
            type="button"
          >
            Try Tonima AI
          </button>
        </motion.div>

        <motion.div
          className="ai-mockup"
          initial={{ opacity: 0, scale: 0.9, rotateY: -10 }}
          whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div
            className="glass-card chat-interface"
            onClick={() => navigate('/ai-assistant')}
            style={{ cursor: 'pointer' }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                navigate('/ai-assistant');
              }
            }}
          >
            <div className="chat-header">
              <div className="bot-avatar">
                <Bot size={24} />
              </div>
              <div>
                <h4>Tonima AI</h4>
                <span className="online-status">Online</span>
              </div>
            </div>

            <div className="chat-messages">
              <div className="message bot-msg">
                Hello! I'm Tonima AI, your AI PC building assistant. What kind of PC are you looking
                to build today?
              </div>
              <div className="message user-msg">
                {typedText}
                <span className="cursor-blink">|</span>
              </div>
            </div>

            <div className="chat-input-area">
              <div className="chat-input glass">
                <span>Ask anything...</span>
                <button
                  className="icon-btn send-btn"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/ai-assistant');
                  }}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="ai-glow-bg"></div>
        </motion.div>
      </div>
    </section>
  );
}
