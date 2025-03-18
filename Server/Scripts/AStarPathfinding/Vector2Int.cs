namespace AStarPathfinding 
{
    public struct Vector2Int 
    {
        public int X;
        public int Y;

        public Vector2Int(int x, int y) 
        {
            X = x;
            Y = y;
        }

        public override string ToString() => $"[{X},{Y}]";
        
        public override bool Equals(object obj)
        {
            if (!(obj is Vector2Int))
                return false;
            
            Vector2Int other = (Vector2Int)obj;
            return X == other.X && Y == other.Y;
        }
        
        public override int GetHashCode()
        {
            return X.GetHashCode() ^ (Y.GetHashCode() << 2);
        }
        
        public static bool operator ==(Vector2Int lhs, Vector2Int rhs) => lhs.X == rhs.X && lhs.Y == rhs.Y;
        public static bool operator !=(Vector2Int lhs, Vector2Int rhs) => lhs.X != rhs.X || lhs.Y != rhs.Y;
    }
}