import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const VendorQuestions = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/vendor/questions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setQuestions(response.data);
      } catch (err) {
        setError('Failed to load questions');
        console.error('Error fetching questions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  if (loading) {
    return <div className="p-4">Loading questions...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800">Product Questions</h2>
        </div>

        <div className="p-6">
          {questions.length === 0 ? (
            <p className="text-gray-500">No questions received yet.</p>
          ) : (
            <ul className="space-y-4">
              {questions.map((question) => (
                <li key={question._id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <Link 
                        to={`/product/${question.product?._id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {question.product?.name}
                      </Link>
                      <p className="mt-2 text-gray-700">{question.question}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      question.answer ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {question.answer ? 'Answered' : 'Pending'}
                    </span>
                  </div>
                  
                  {!question.answer && (
                    <button 
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                               transition duration-150 ease-in-out text-sm"
                      onClick={() => {/* Add answer handler */}}
                    >
                      Answer Question
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorQuestions;