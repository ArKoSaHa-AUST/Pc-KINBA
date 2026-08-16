import { ShieldCheck } from 'lucide-react';

interface ReviewReplyProps {
  storeName: string;
  content: string;
  date: string;
}

export default function ReviewReply({ storeName, content, date }: ReviewReplyProps) {
  return (
    <div className="mt-6 ml-6 pl-4 border-l-2 border-cyan-500/30">
      <div className="bg-cyan-500/5 rounded-xl p-5 border border-cyan-500/10">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-cyan-400 text-sm">{storeName}</span>
          <span className="text-xs text-cyan-400/60 bg-cyan-400/10 px-2 py-0.5 rounded-full font-medium">
            Official Response
          </span>
          <span className="text-xs text-gray-500 ml-auto">{date}</span>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">{content}</p>
      </div>
    </div>
  );
}
